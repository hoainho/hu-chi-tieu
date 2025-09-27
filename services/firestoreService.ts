import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  writeBatch,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
  or,
  Firestore
} from 'firebase/firestore';
import db from './firebase';
import { Transaction, IncomeSource, Category, Asset, UserProfile, Account, SpendingSource } from '../types';
import { User } from 'firebase/auth';
import { updateEnvelopeSpending } from './accountService';

// Helper function to ensure database is available
const ensureDb = (): Firestore => {
  if (!db) {
    throw new Error('Firestore database is not initialized. Please check your Firebase configuration.');
  }
  return db;
};

// Helper function to handle Firestore operations with proper error handling
const handleFirestoreOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Firestore operation failed:', error);
    // Avoid circular JSON issues by creating a clean error object
    if (error instanceof Error) {
      throw new Error(`Firestore operation failed: ${error.message}`);
    } else {
      throw new Error('Firestore operation failed: Unknown error');
    }
  }
};

// --- Spending Sources ---

export const getSpendingSources = async (userId: string): Promise<SpendingSource[]> => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    console.log('Fetching spending sources for user:', userId);
    
    try {
      // Query for owned sources (without orderBy to avoid index requirement)
      const ownedQuery = query(
        collection(database, 'spendingSources'),
        where('ownerId', '==', userId)
      );
      
      const ownedSnapshot = await getDocs(ownedQuery);
      const ownedSources = ownedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpendingSource));
      
      console.log('Found owned sources:', ownedSources.length);
      
      // For now, only get owned sources to avoid composite index issues
      // TODO: Add shared sources query when composite index is available
      const allSources = ownedSources;
      
      // Sort in JavaScript instead of Firestore
      console.log('Total spending sources:', allSources.length, allSources);
      return allSources.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    } catch (error) {
      console.error('Error fetching spending sources:', error);
      // Fallback: get all documents without any filtering
      const allQuery = query(collection(database, 'spendingSources'));
      const allSnapshot = await getDocs(allQuery);
      const allSources = allSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as SpendingSource))
        .filter(source => source.ownerId === userId || source.coupleId === userId);
      
      console.log('Fallback: Total spending sources:', allSources.length);
      return allSources.sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
    }
  });
};

export const addSpendingSource = async (spendingSource: Omit<SpendingSource, 'id'>) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    console.log('Adding spending source to Firestore:', spendingSource);
    const docRef = await addDoc(collection(database, 'spendingSources'), spendingSource);
    console.log('Added spending source with ID:', docRef.id);
    return docRef;
  });
};

export const updateSpendingSource = async (id: string, updates: Partial<SpendingSource>) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    const spendingSourceRef = doc(database, 'spendingSources', id);
    await updateDoc(spendingSourceRef, { ...updates, updatedAt: Timestamp.now() });
  });
};

export const deleteSpendingSource = async (id: string) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    await deleteDoc(doc(database, 'spendingSources', id));
  });
};

export const updateSpendingSourceBalance = async (id: string, amount: number, operation: 'add' | 'subtract') => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    const spendingSourceRef = doc(database, 'spendingSources', id);
    const spendingSourceDoc = await getDoc(spendingSourceRef);
    
    if (!spendingSourceDoc.exists()) {
      throw new Error('Spending source not found');
    }
    
    const currentBalance = spendingSourceDoc.data().balance || 0;
    const newBalance = operation === 'add' ? currentBalance + amount : currentBalance - amount;
    
    await updateDoc(spendingSourceRef, {
      balance: newBalance,
      updatedAt: Timestamp.now()
    });
    
    return newBalance;
  });
};

// --- User Profile ---

export const createUserProfile = async (user: User, name: string) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    const userProfileRef = doc(database, 'users', user.uid);
    const userProfile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      name: name,
      accountIds: [],
      preferences: {
        baseCurrency: 'VND',
        theme: 'light',
        notifications: true,
        language: 'vi'
      },
      createdAt: Timestamp.now()
    };
    await setDoc(userProfileRef, userProfile);
  });
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    const userProfileRef = doc(database, 'users', userId);
    const docSnap = await getDoc(userProfileRef);
    if (docSnap.exists()) {
      const profile = docSnap.data() as UserProfile;
      
      // Validate profile structure
      if (!profile.preferences) {
        console.warn('Profile missing preferences, adding defaults');
        profile.preferences = {
          baseCurrency: 'VND',
          theme: 'light',
          notifications: true,
          language: 'vi'
        };
      }
      
      return profile;
    }
    return null;
  });
};

// --- Couple Management ---
export const createInvite = async (fromUserId: string): Promise<string> => {
    const database = ensureDb();
    const invitesCol = collection(database, 'invites');
    const newInviteRef = await addDoc(invitesCol, {
        fromUserId,
        createdAt: Timestamp.now(),
    });
    return newInviteRef.id;
}

export const getInvite = async(inviteId: string) => {
    const database = ensureDb();
    const inviteRef = doc(database, 'invites', inviteId);
    return await getDoc(inviteRef);
}

export const acceptInvite = async (inviteId: string, fromUserId: string, acceptingUserId: string) => {
    const database = ensureDb();
    const coupleId = [fromUserId, acceptingUserId].sort().join('_');
    const fromUserRef = doc(database, 'users', fromUserId);
    const acceptingUserRef = doc(database, 'users', acceptingUserId);
    const coupleRef = doc(database, 'couples', coupleId);
    const inviteRef = doc(database, 'invites', inviteId);

    const fromUserProfile = await getUserProfile(fromUserId);
    const acceptingUserProfile = await getUserProfile(acceptingUserId);

    if (!fromUserProfile || !acceptingUserProfile) {
        throw new Error("Could not find user profiles");
    }

    const batch = writeBatch(database);

    batch.set(coupleRef, {
        members: [fromUserId, acceptingUserId]
    });
    batch.update(fromUserRef, { coupleId, partnerId: acceptingUserId, partnerName: acceptingUserProfile.name });
    batch.update(acceptingUserRef, { coupleId, partnerId: fromUserId, partnerName: fromUserProfile.name });
    batch.delete(inviteRef);

    await batch.commit();
}


// --- Generic Fetch for Shared/Private Data ---
const getPersonalAndSharedData = async <T>(collectionName: string, userId: string, coupleId?: string): Promise<T[]> => {
    const database = ensureDb();
    const dataCol = collection(database, collectionName);
    
    let allData: T[] = [];

    if (coupleId) {
        // Fetch personal data and shared data separately to avoid compound index requirements
        const personalQuery = query(dataCol, where('ownerId', '==', userId));
        const sharedQuery = query(dataCol, where('coupleId', '==', coupleId));
        
        const [personalSnapshot, sharedSnapshot] = await Promise.all([
            getDocs(personalQuery),
            getDocs(sharedQuery)
        ]);
        
        const personalData = personalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        const sharedData = sharedSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
        
        // Combine and deduplicate (in case a document matches both conditions)
        const combinedData = [...personalData, ...sharedData];
        const uniqueData = combinedData.filter((item, index, self) => 
            index === self.findIndex(t => (t as any).id === (item as any).id)
        );
        
        allData = uniqueData;
    } else {
        // Fetch only personal data if not in a couple
        const personalQuery = query(dataCol, where('ownerId', '==', userId));
        const personalSnapshot = await getDocs(personalQuery);
        allData = personalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    }

    // Sort by date in memory (descending order - newest first)
    return allData.sort((a, b) => {
        const dateA = (a as any).date?.toDate?.() || (a as any).date || new Date(0);
        const dateB = (b as any).date?.toDate?.() || (b as any).date || new Date(0);
        return dateB.getTime() - dateA.getTime();
    });
}


// --- Transactions ---
export const getTransactions = (userId: string, coupleId?: string): Promise<Transaction[]> => {
    return handleFirestoreOperation(() => getPersonalAndSharedData<Transaction>('transactions', userId, coupleId));
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    
    // Add transaction
    const docRef = await addDoc(collection(database, 'transactions'), transaction);
    
    // Update envelope spending if envelope is specified
    if (transaction.envelope && transaction.accountId) {
      try {
        await updateEnvelopeSpending(
          transaction.accountId, 
          transaction.envelope, 
          transaction.amount, 
          true // Add to spending
        );
      } catch (error) {
        console.warn('Failed to update envelope spending:', error);
        // Don't fail the transaction if envelope update fails
      }
    }
    
    return docRef;
  });
};

export const deleteTransaction = async (transactionId: string) => {
  return handleFirestoreOperation(async () => {
    const database = ensureDb();
    
    // Get transaction first to update envelope
    const transactionRef = doc(database, 'transactions', transactionId);
    const transactionSnap = await getDoc(transactionRef);
    
    if (transactionSnap.exists()) {
      const transaction = transactionSnap.data() as Transaction;
      
      // Delete transaction
      await deleteDoc(transactionRef);
      
      // Update envelope spending (subtract the amount)
      if (transaction.envelope && transaction.accountId) {
        try {
          await updateEnvelopeSpending(
            transaction.accountId, 
            transaction.envelope, 
            transaction.amount, 
            false // Subtract from spending
          );
        } catch (error) {
          console.warn('Failed to update envelope spending on delete:', error);
        }
      }
    } else {
      throw new Error('Transaction not found');
    }
  });
};

// --- Income Sources ---
export const getIncomes = (userId: string, coupleId?: string): Promise<IncomeSource[]> => {
    return handleFirestoreOperation(() => getPersonalAndSharedData<IncomeSource>('incomes', userId, coupleId));
}

export const addIncome = (income: Omit<IncomeSource, 'id'>) => {
  const database = ensureDb();
  return addDoc(collection(database, 'incomes'), income);
};

export const deleteIncome = (incomeId: string) => {
  const database = ensureDb();
  return deleteDoc(doc(database, 'incomes', incomeId));
};

// --- Assets ---
export const getAssets = (userId: string, coupleId?: string): Promise<Asset[]> => {
    return handleFirestoreOperation(() => getPersonalAndSharedData<Asset>('assets', userId, coupleId));
}


export const addAsset = (asset: Omit<Asset, 'id'>) => {
  const database = ensureDb();
  return addDoc(collection(database, 'assets'), asset);
};

export const updateAsset = (assetId: string, data: Partial<Asset>) => {
    const database = ensureDb();
    return updateDoc(doc(database, 'assets', assetId), data);
};

export const deleteAsset = (assetId: string) => {
  const database = ensureDb();
  return deleteDoc(doc(database, 'assets', assetId));
};


// --- Categories ---
export const getCategories = async (userId: string): Promise<Category[]> => {
    return handleFirestoreOperation(async () => {
        const database = ensureDb();
        const categoriesCol = collection(database, 'categories');
        // Remove orderBy to avoid index requirement, we'll sort in memory
        const q = query(categoriesCol, where('ownerId', '==', userId));
        let categorySnapshot = await getDocs(q);

        // No default categories - user will create their own

        const categories = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category));
        
        // Sort by name in memory
        return categories.sort((a, b) => a.name.localeCompare(b.name));
    });
};


export const addCategory = (category: Omit<Category, 'id'>) => {
  const database = ensureDb();
  return addDoc(collection(database, 'categories'), category);
};

export const updateCategory = (categoryId: string, newName: string) => {
  const database = ensureDb();
  return updateDoc(doc(database, 'categories', categoryId), { name: newName });
};

export const deleteCategory = (categoryId: string) => {
  const database = ensureDb();
  return deleteDoc(doc(database, 'categories', categoryId));
};
