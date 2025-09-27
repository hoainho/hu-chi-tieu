/**
 * Client-side encryption utilities using Web Crypto API
 * For sensitive financial data encryption
 */

interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string;   // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt
}

class FieldEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12;
  private static readonly SALT_LENGTH = 16;
  private static readonly ITERATIONS = 100000;

  /**
   * Derives a key from user password and salt using PBKDF2
   */
  private static async deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypts a string using AES-GCM
   */
  static async encrypt(plaintext: string, password: string): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(plaintext);
      
      // Generate random salt and IV
      const salt = crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Derive key from password and salt
      const key = await this.deriveKey(password, salt);
      
      // Encrypt the data
      const encrypted = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        data
      );
      
      // Return base64 encoded result
      return {
        data: this.arrayBufferToBase64(encrypted),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt)
      };
      
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypts data using AES-GCM
   */
  static async decrypt(encryptedData: EncryptedData, password: string): Promise<string> {
    try {
      // Convert base64 back to ArrayBuffer
      const data = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);
      
      // Derive the same key
      const key = await this.deriveKey(password, new Uint8Array(salt));
      
      // Decrypt the data
      const decrypted = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: new Uint8Array(iv)
        },
        key,
        data
      );
      
      // Convert back to string
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
      
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data - invalid password or corrupted data');
    }
  }

  /**
   * Encrypts sensitive fields in an object
   */
  static async encryptFields<T extends Record<string, any>>(
    obj: T, 
    fieldsToEncrypt: (keyof T)[], 
    password: string
  ): Promise<T & { _encrypted: string[] }> {
    const result = { ...obj } as T & { _encrypted: string[] };
    result._encrypted = [];

    for (const field of fieldsToEncrypt) {
      if (obj[field] !== undefined && obj[field] !== null) {
        const plaintext = typeof obj[field] === 'string' ? obj[field] : JSON.stringify(obj[field]);
        const encrypted = await this.encrypt(plaintext, password);
        result[field] = encrypted as any;
        result._encrypted.push(field as string);
      }
    }

    return result;
  }

  /**
   * Decrypts sensitive fields in an object
   */
  static async decryptFields<T extends Record<string, any>>(
    obj: T & { _encrypted?: string[] }, 
    password: string
  ): Promise<T> {
    if (!obj._encrypted || obj._encrypted.length === 0) {
      const result = { ...obj };
      delete (result as any)._encrypted;
      return result as T;
    }

    const result = { ...obj } as any;
    const encryptedFields = obj._encrypted;
    delete result._encrypted;

    for (const field of encryptedFields) {
      if (obj[field as keyof typeof obj] && typeof obj[field as keyof typeof obj] === 'object') {
        try {
          const decrypted = await this.decrypt(obj[field as keyof typeof obj] as EncryptedData, password);
          // Try to parse as JSON, fallback to string
          try {
            result[field] = JSON.parse(decrypted);
          } catch {
            result[field] = decrypted;
          }
        } catch (error) {
          console.warn(`Failed to decrypt field ${field}:`, error);
          // Keep encrypted data if decryption fails
        }
      }
    }

    return result as T;
  }

  /**
   * Generates a secure random password for encryption
   */
  static generateSecurePassword(length: number = 32): string {
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    
    return Array.from(array, byte => charset[byte % charset.length]).join('');
  }

  /**
   * Derives a deterministic password from user credentials
   * WARNING: This is for demo purposes. In production, use proper key management.
   */
  static async deriveUserPassword(userId: string, userEmail: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(userId + userEmail + 'HuChiTieu-Salt-2024');
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = new Uint8Array(hashBuffer);
    
    // Convert to base64 for use as password
    return this.arrayBufferToBase64(hashBuffer).substring(0, 32);
  }

  /**
   * Utility: Convert ArrayBuffer to Base64
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Convert Base64 to ArrayBuffer
   */
  private static base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Check if Web Crypto API is available
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' &&
           typeof crypto.getRandomValues !== 'undefined';
  }
}

/**
 * Hook for using encryption in React components
 */
export const useEncryption = (userId?: string, userEmail?: string) => {
  const [encryptionKey, setEncryptionKey] = React.useState<string | null>(null);
  const [isSupported, setIsSupported] = React.useState(false);

  React.useEffect(() => {
    setIsSupported(FieldEncryption.isSupported());
    
    if (userId && userEmail && FieldEncryption.isSupported()) {
      FieldEncryption.deriveUserPassword(userId, userEmail)
        .then(setEncryptionKey)
        .catch(console.error);
    }
  }, [userId, userEmail]);

  const encryptData = React.useCallback(async (data: string) => {
    if (!encryptionKey) throw new Error('Encryption key not available');
    return FieldEncryption.encrypt(data, encryptionKey);
  }, [encryptionKey]);

  const decryptData = React.useCallback(async (encryptedData: EncryptedData) => {
    if (!encryptionKey) throw new Error('Encryption key not available');
    return FieldEncryption.decrypt(encryptedData, encryptionKey);
  }, [encryptionKey]);

  const encryptFields = React.useCallback(async <T extends Record<string, any>>(
    obj: T, 
    fields: (keyof T)[]
  ) => {
    if (!encryptionKey) throw new Error('Encryption key not available');
    return FieldEncryption.encryptFields(obj, fields, encryptionKey);
  }, [encryptionKey]);

  const decryptFields = React.useCallback(async <T extends Record<string, any>>(
    obj: T & { _encrypted?: string[] }
  ) => {
    if (!encryptionKey) throw new Error('Encryption key not available');
    return FieldEncryption.decryptFields(obj, encryptionKey);
  }, [encryptionKey]);

  return {
    isSupported,
    isReady: !!encryptionKey,
    encryptData,
    decryptData,
    encryptFields,
    decryptFields
  };
};

export default FieldEncryption;

// Import React for the hook
import React from 'react';
