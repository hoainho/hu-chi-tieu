import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  Timestamp,
  arrayUnion
} from 'firebase/firestore';
import db from './firebase';
import { Account, Envelope, UserProfile } from '../types';

// Helper function to ensure database is available
const ensureDb = () => {
  if (!db) {
    throw new Error('Firestore database is not initialized');
  }
  return db;
};

// Helper function for error handling
const handleAccountOperation = async <T>(operation: () => Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    console.error('Account operation failed:', error);
    if (error instanceof Error) {
      throw new Error(`Account operation failed: ${error.message}`);
    } else {
      throw new Error('Account operation failed: Unknown error');
    }
  }
};

// --- Account Management ---
export const createAccount = async (
  name: string, 
  type: 'personal' | 'shared', 
  ownerIds: string[],
  currency: 'VND' | 'USD' | 'EUR' | 'JPY' = 'VND'
): Promise<string> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    
    const newAccount: Omit<Account, 'id'> = {
      name,
      type,
      ownerIds,
      currency,
      balance: 0,
      envelopes: {}, // Empty envelopes - user will create their own
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(database, 'accounts'), newAccount);
    
    // Update user profiles to include this account using arrayUnion
    const batch = writeBatch(database);
    for (const userId of ownerIds) {
      const userRef = doc(database, 'users', userId);
      
      // Check if user document exists first
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        // Use arrayUnion to add accountId without duplicates
        batch.update(userRef, {
          accountIds: arrayUnion(docRef.id)
        });
      } else {
        console.warn(`User ${userId} not found, skipping accountIds update`);
      }
    }
    await batch.commit();
    
    return docRef.id;
  });
};

export const getAccountsByUser = async (userId: string): Promise<Account[]> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    
    const accountsQuery = query(
      collection(database, 'accounts'),
      where('ownerIds', 'array-contains', userId)
    );
    
    const snapshot = await getDocs(accountsQuery);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Account));
  });
};

export const getAccount = async (accountId: string): Promise<Account | null> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const docSnap = await getDoc(doc(database, 'accounts', accountId));
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Account;
    }
    return null;
  });
};

export const updateAccount = async (accountId: string, updates: Partial<Account>): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    await updateDoc(doc(database, 'accounts', accountId), updates);
  });
};

export const deleteAccount = async (accountId: string): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    
    // TODO: Add validation to ensure no transactions exist
    // TODO: Remove account from user profiles
    
    await deleteDoc(doc(database, 'accounts', accountId));
  });
};

// --- Envelope Management ---
export const createEnvelope = async (
  accountId: string, 
  envelopeName: string, 
  allocatedAmount: number
): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const accountRef = doc(database, 'accounts', accountId);
    
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('Account not found');
    }
    
    const account = accountSnap.data() as Account;
    const updatedEnvelopes = {
      ...account.envelopes,
      [envelopeName]: { allocated: allocatedAmount, spent: 0 }
    };
    
    await updateDoc(accountRef, { envelopes: updatedEnvelopes });
  });
};

export const updateEnvelopeAllocation = async (
  accountId: string, 
  envelopeName: string, 
  newAllocation: number
): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const accountRef = doc(database, 'accounts', accountId);
    
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('Account not found');
    }
    
    const account = accountSnap.data() as Account;
    if (!account.envelopes[envelopeName]) {
      throw new Error('Envelope not found');
    }
    
    const updatedEnvelopes = {
      ...account.envelopes,
      [envelopeName]: {
        ...account.envelopes[envelopeName],
        allocated: newAllocation
      }
    };
    
    await updateDoc(accountRef, { envelopes: updatedEnvelopes });
  });
};

export const updateEnvelopeSpending = async (
  accountId: string, 
  envelopeName: string, 
  spentAmount: number,
  isAdd: boolean = true
): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const accountRef = doc(database, 'accounts', accountId);
    
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('Account not found');
    }
    
    const account = accountSnap.data() as Account;
    if (!account.envelopes[envelopeName]) {
      throw new Error('Envelope not found');
    }
    
    const currentSpent = account.envelopes[envelopeName].spent;
    const newSpent = isAdd ? currentSpent + spentAmount : currentSpent - spentAmount;
    
    const updatedEnvelopes = {
      ...account.envelopes,
      [envelopeName]: {
        ...account.envelopes[envelopeName],
        spent: Math.max(0, newSpent) // Ensure spent never goes negative
      }
    };
    
    await updateDoc(accountRef, { envelopes: updatedEnvelopes });
  });
};

export const deleteEnvelope = async (accountId: string, envelopeName: string): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const accountRef = doc(database, 'accounts', accountId);
    
    const accountSnap = await getDoc(accountRef);
    if (!accountSnap.exists()) {
      throw new Error('Account not found');
    }
    
    const account = accountSnap.data() as Account;
    const updatedEnvelopes = { ...account.envelopes };
    delete updatedEnvelopes[envelopeName];
    
    await updateDoc(accountRef, { envelopes: updatedEnvelopes });
  });
};

// --- Utility Functions ---
export const getEnvelopeStatus = (envelope: { allocated: number; spent: number }) => {
  const remaining = envelope.allocated - envelope.spent;
  const percentage = envelope.allocated > 0 ? (envelope.spent / envelope.allocated) * 100 : 0;
  
  return {
    remaining,
    percentage,
    isOverspent: envelope.spent > envelope.allocated,
    status: percentage >= 90 ? 'critical' : percentage >= 75 ? 'warning' : 'good'
  };
};

export const calculateTotalBudget = (envelopes: Record<string, { allocated: number; spent: number }>) => {
  const totalAllocated = Object.values(envelopes).reduce((sum, env) => sum + env.allocated, 0);
  const totalSpent = Object.values(envelopes).reduce((sum, env) => sum + env.spent, 0);
  
  return {
    totalAllocated,
    totalSpent,
    totalRemaining: totalAllocated - totalSpent,
    overallPercentage: totalAllocated > 0 ? (totalSpent / totalAllocated) * 100 : 0
  };
};

// --- Shared Account Management ---
export const inviteToSharedAccount = async (
  accountId: string, 
  inviterUserId: string, 
  inviteeEmail: string
): Promise<string> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    
    // Create invitation document
    const inviteData = {
      accountId,
      inviterUserId,
      inviteeEmail,
      status: 'pending',
      createdAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    const inviteRef = await addDoc(collection(database, 'accountInvites'), inviteData);
    return inviteRef.id;
  });
};

export const acceptAccountInvite = async (inviteId: string, userId: string): Promise<void> => {
  return handleAccountOperation(async () => {
    const database = ensureDb();
    const batch = writeBatch(database);
    
    // Get invite
    const inviteRef = doc(database, 'accountInvites', inviteId);
    const inviteSnap = await getDoc(inviteRef);
    
    if (!inviteSnap.exists()) {
      throw new Error('Invite not found');
    }
    
    const invite = inviteSnap.data();
    if (invite.status !== 'pending') {
      throw new Error('Invite is no longer valid');
    }
    
    // Add user to account
    const accountRef = doc(database, 'accounts', invite.accountId);
    const accountSnap = await getDoc(accountRef);
    
    if (!accountSnap.exists()) {
      throw new Error('Account not found');
    }
    
    const account = accountSnap.data() as Account;
    
    // Use arrayUnion to add userId to account ownerIds
    batch.update(accountRef, { ownerIds: arrayUnion(userId) });
    
    // Update user profile using arrayUnion
    const userRef = doc(database, 'users', userId);
    batch.update(userRef, {
      accountIds: arrayUnion(invite.accountId)
    });
    
    // Mark invite as accepted
    batch.update(inviteRef, { status: 'accepted', acceptedAt: Timestamp.now() });
    
    await batch.commit();
  });
};
