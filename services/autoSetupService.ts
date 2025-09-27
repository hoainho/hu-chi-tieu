import { Timestamp } from 'firebase/firestore';
import { Account, UserProfile } from '../types';
import { createAccount } from './accountService';

class AutoSetupService {
  /**
   * Auto-setup user with empty default account only
   */
  async setupNewUser(profile: UserProfile): Promise<void> {
    try {
      console.log('Setting up new user with empty account...');
      
      // Only create empty default personal account
      await this.createDefaultAccount(profile);
      
      console.log('User setup completed successfully!');
      
    } catch (error) {
      console.error('Failed to setup new user:', error);
      throw error;
    }
  }

  /**
   * Create empty default personal account
   */
  private async createDefaultAccount(profile: UserProfile): Promise<Account> {
    // Validate profile and preferences
    if (!profile) {
      throw new Error('Profile is required to create default account');
    }
    
    if (!profile.preferences) {
      console.warn('Profile missing preferences, using defaults');
    }
    
    const account: Omit<Account, 'id'> = {
      name: 'Tài khoản chính',
      type: 'personal',
      ownerIds: [profile.uid],
      currency: profile.preferences?.baseCurrency || 'VND',
      balance: 0, // Start with 0 balance
      envelopes: {}, // No default envelopes
      createdAt: Timestamp.now()
    };

    const accountId = await createAccount(account.name, account.type, [profile.uid]);
    return { ...account, id: accountId };
  }

  /**
   * Check if user needs auto-setup (no accounts exist)
   */
  async shouldAutoSetup(profile: UserProfile): Promise<boolean> {
    return !profile.accountIds || profile.accountIds.length === 0;
  }
}

export default new AutoSetupService();
