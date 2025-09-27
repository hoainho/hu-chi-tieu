import { 
  collection, 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  Timestamp,
  query,
  where,
  orderBy,
  getDocs
} from 'firebase/firestore';
import db from './firebase';

export interface AvailableBalanceRecord {
  id?: string;
  userId: string;
  coupleId?: string;
  balance: number;
  month: string; // Format: "2024-01"
  incomeAdded: number;
  spendingDeducted: number;
  investmentDeducted: number;
  netChange: number;
  updatedAt: Timestamp;
  createdAt: Timestamp;
}

export interface AvailableBalanceTransaction {
  id?: string;
  userId: string;
  coupleId?: string;
  type: 'income' | 'spending' | 'investment';
  amount: number; // Positive for income, negative for spending/investment
  description: string;
  sourceId: string; // ID of the income/transaction/investment that caused this
  balanceBefore: number;
  balanceAfter: number;
  timestamp: Timestamp;
}

class AvailableBalanceService {
  private getCollectionPath(userId: string, coupleId?: string) {
    return coupleId ? `couples/${coupleId}/availableBalance` : `users/${userId}/availableBalance`;
  }

  private getTransactionCollectionPath(userId: string, coupleId?: string) {
    return coupleId ? `couples/${coupleId}/availableBalanceTransactions` : `users/${userId}/availableBalanceTransactions`;
  }

  /**
   * Get current available balance
   */
  async getCurrentBalance(userId: string, coupleId?: string): Promise<number> {
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // "2024-01"
      const collectionPath = this.getCollectionPath(userId, coupleId);
      const docRef = doc(db, collectionPath, currentMonth);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data().balance || 0;
      }
      
      // If no record for current month, get the latest balance
      const q = query(
        collection(db, collectionPath),
        orderBy('month', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        return latestDoc.data().balance || 0;
      }
      
      return 0;
    } catch (error) {
      console.error('Error getting current balance:', error);
      return 0;
    }
  }

  /**
   * Add income to available balance
   */
  async addIncome(
    userId: string, 
    amount: number, 
    description: string, 
    sourceId: string,
    coupleId?: string
  ): Promise<void> {
    try {
      const currentBalance = await this.getCurrentBalance(userId, coupleId);
      const newBalance = currentBalance + amount;
      
      await this.updateBalance(userId, amount, 'income', coupleId);
      await this.recordTransaction(
        userId, 
        'income', 
        amount, 
        description, 
        sourceId, 
        currentBalance, 
        newBalance,
        coupleId
      );
    } catch (error) {
      console.error('Error adding income:', error);
      throw error;
    }
  }

  /**
   * Deduct spending from available balance
   */
  async deductSpending(
    userId: string, 
    amount: number, 
    description: string, 
    sourceId: string,
    coupleId?: string
  ): Promise<void> {
    try {
      const currentBalance = await this.getCurrentBalance(userId, coupleId);
      const newBalance = currentBalance - amount;
      
      await this.updateBalance(userId, -amount, 'spending', coupleId);
      await this.recordTransaction(
        userId, 
        'spending', 
        -amount, 
        description, 
        sourceId, 
        currentBalance, 
        newBalance,
        coupleId
      );
    } catch (error) {
      console.error('Error deducting spending:', error);
      throw error;
    }
  }

  /**
   * Deduct investment from available balance
   */
  async deductInvestment(
    userId: string, 
    amount: number, 
    description: string, 
    sourceId: string,
    coupleId?: string
  ): Promise<void> {
    try {
      const currentBalance = await this.getCurrentBalance(userId, coupleId);
      const newBalance = currentBalance - amount;
      
      await this.updateBalance(userId, -amount, 'investment', coupleId);
      await this.recordTransaction(
        userId, 
        'investment', 
        -amount, 
        description, 
        sourceId, 
        currentBalance, 
        newBalance,
        coupleId
      );
    } catch (error) {
      console.error('Error deducting investment:', error);
      throw error;
    }
  }

  /**
   * Update monthly balance record
   */
  private async updateBalance(
    userId: string, 
    amount: number, 
    type: 'income' | 'spending' | 'investment',
    coupleId?: string
  ): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7);
    const collectionPath = this.getCollectionPath(userId, coupleId);
    const docRef = doc(db, collectionPath, currentMonth);
    
    const docSnap = await getDoc(docRef);
    const now = Timestamp.now();
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      const updates: Partial<AvailableBalanceRecord> = {
        balance: (data.balance || 0) + amount,
        updatedAt: now
      };
      
      if (type === 'income') {
        updates.incomeAdded = (data.incomeAdded || 0) + amount;
      } else if (type === 'spending') {
        updates.spendingDeducted = (data.spendingDeducted || 0) + Math.abs(amount);
      } else if (type === 'investment') {
        updates.investmentDeducted = (data.investmentDeducted || 0) + Math.abs(amount);
      }
      
      updates.netChange = (updates.incomeAdded || data.incomeAdded || 0) - 
                         (updates.spendingDeducted || data.spendingDeducted || 0) - 
                         (updates.investmentDeducted || data.investmentDeducted || 0);
      
      await updateDoc(docRef, updates);
    } else {
      // Create new record
      const newRecord: AvailableBalanceRecord = {
        userId,
        balance: amount,
        month: currentMonth,
        incomeAdded: type === 'income' ? amount : 0,
        spendingDeducted: type === 'spending' ? Math.abs(amount) : 0,
        investmentDeducted: type === 'investment' ? Math.abs(amount) : 0,
        netChange: amount,
        updatedAt: now,
        createdAt: now,
        ...(coupleId && { coupleId })
      };
      
      await setDoc(docRef, newRecord);
    }
  }

  /**
   * Record individual transaction
   */
  private async recordTransaction(
    userId: string,
    type: 'income' | 'spending' | 'investment',
    amount: number,
    description: string,
    sourceId: string,
    balanceBefore: number,
    balanceAfter: number,
    coupleId?: string
  ): Promise<void> {
    const collectionPath = this.getTransactionCollectionPath(userId, coupleId);
    const transactionRef = doc(collection(db, collectionPath));
    
    const transaction: AvailableBalanceTransaction = {
      userId,
      type,
      amount,
      description,
      sourceId,
      balanceBefore,
      balanceAfter,
      timestamp: Timestamp.now(),
      ...(coupleId && { coupleId })
    };
    
    await setDoc(transactionRef, transaction);
  }

  /**
   * Get balance history
   */
  async getBalanceHistory(userId: string, coupleId?: string): Promise<AvailableBalanceRecord[]> {
    try {
      const collectionPath = this.getCollectionPath(userId, coupleId);
      const q = query(
        collection(db, collectionPath),
        orderBy('month', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AvailableBalanceRecord));
    } catch (error) {
      console.error('Error getting balance history:', error);
      return [];
    }
  }

  /**
   * Get transaction history
   */
  async getTransactionHistory(userId: string, coupleId?: string): Promise<AvailableBalanceTransaction[]> {
    try {
      const collectionPath = this.getTransactionCollectionPath(userId, coupleId);
      const q = query(
        collection(db, collectionPath),
        orderBy('timestamp', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AvailableBalanceTransaction));
    } catch (error) {
      console.error('Error getting transaction history:', error);
      return [];
    }
  }
}

export const availableBalanceService = new AvailableBalanceService();
export default availableBalanceService;
