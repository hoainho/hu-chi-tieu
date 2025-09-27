/**
 * Client-side Encryption Service sử dụng Web Crypto API
 * Mã hóa dữ liệu nhạy cảm như ghi chú giao dịch, thông tin cá nhân
 */

interface EncryptedData {
  encryptedContent: string; // Base64 encoded
  iv: string; // Initialization Vector (Base64)
  salt: string; // Salt cho key derivation (Base64)
  algorithm: string; // Thuật toán mã hóa
  keyDerivation: string; // Phương pháp tạo key
}

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

class EncryptionService {
  private readonly ALGORITHM = 'AES-GCM';
  private readonly KEY_LENGTH = 256;
  private readonly IV_LENGTH = 12; // 96 bits cho AES-GCM
  private readonly SALT_LENGTH = 16; // 128 bits
  private readonly ITERATIONS = 100000; // PBKDF2 iterations

  /**
   * Tạo key từ password sử dụng PBKDF2
   */
  private async deriveKeyFromPassword(
    password: string, 
    salt: Uint8Array
  ): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);
    
    // Import password làm key material
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive AES key từ password
    return window.crypto.subtle.deriveKey(
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
   * Mã hóa dữ liệu với password
   */
  async encryptWithPassword(
    plaintext: string, 
    password: string
  ): Promise<EncryptedData> {
    try {
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);
      
      // Tạo random salt và IV
      const salt = window.crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
      const iv = window.crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Derive key từ password
      const key = await this.deriveKeyFromPassword(password, salt);
      
      // Mã hóa
      const encryptedBuffer = await window.crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        plaintextBuffer
      );
      
      return {
        encryptedContent: this.arrayBufferToBase64(encryptedBuffer),
        iv: this.arrayBufferToBase64(iv),
        salt: this.arrayBufferToBase64(salt),
        algorithm: this.ALGORITHM,
        keyDerivation: 'PBKDF2'
      };
    } catch (error) {
      console.error('Lỗi mã hóa:', error);
      throw new Error('Không thể mã hóa dữ liệu');
    }
  }

  /**
   * Giải mã dữ liệu với password
   */
  async decryptWithPassword(
    encryptedData: EncryptedData, 
    password: string
  ): Promise<string> {
    try {
      // Convert base64 về ArrayBuffer
      const encryptedBuffer = this.base64ToArrayBuffer(encryptedData.encryptedContent);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);
      
      // Derive key từ password
      const key = await this.deriveKeyFromPassword(password, new Uint8Array(salt));
      
      // Giải mã
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: encryptedData.algorithm,
          iv: new Uint8Array(iv)
        },
        key,
        encryptedBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Lỗi giải mã:', error);
      throw new Error('Không thể giải mã dữ liệu. Kiểm tra lại mật khẩu.');
    }
  }

  /**
   * Tạo cặp key RSA cho mã hóa asymmetric
   */
  async generateKeyPair(): Promise<KeyPair> {
    try {
      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: 'RSA-OAEP',
          modulusLength: 2048,
          publicExponent: new Uint8Array([1, 0, 1]),
          hash: 'SHA-256'
        },
        true, // extractable
        ['encrypt', 'decrypt']
      );
      
      return {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey
      };
    } catch (error) {
      console.error('Lỗi tạo key pair:', error);
      throw new Error('Không thể tạo cặp khóa mã hóa');
    }
  }

  /**
   * Export public key để chia sẻ
   */
  async exportPublicKey(publicKey: CryptoKey): Promise<string> {
    try {
      const exported = await window.crypto.subtle.exportKey('spki', publicKey);
      return this.arrayBufferToBase64(exported);
    } catch (error) {
      console.error('Lỗi export public key:', error);
      throw new Error('Không thể export public key');
    }
  }

  /**
   * Import public key từ base64
   */
  async importPublicKey(publicKeyBase64: string): Promise<CryptoKey> {
    try {
      const keyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
      return await window.crypto.subtle.importKey(
        'spki',
        keyBuffer,
        {
          name: 'RSA-OAEP',
          hash: 'SHA-256'
        },
        false,
        ['encrypt']
      );
    } catch (error) {
      console.error('Lỗi import public key:', error);
      throw new Error('Không thể import public key');
    }
  }

  /**
   * Mã hóa với public key (cho couple sharing)
   */
  async encryptWithPublicKey(
    plaintext: string, 
    publicKey: CryptoKey
  ): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const plaintextBuffer = encoder.encode(plaintext);
      
      // RSA-OAEP có giới hạn kích thước, nên dùng hybrid encryption
      // Tạo AES key random để mã hóa data
      const aesKey = await window.crypto.subtle.generateKey(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
      
      // Mã hóa data với AES
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedData = await window.crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        aesKey,
        plaintextBuffer
      );
      
      // Export AES key
      const aesKeyBuffer = await window.crypto.subtle.exportKey('raw', aesKey);
      
      // Mã hóa AES key với RSA public key
      const encryptedKey = await window.crypto.subtle.encrypt(
        {
          name: 'RSA-OAEP'
        },
        publicKey,
        aesKeyBuffer
      );
      
      // Combine encrypted key + iv + encrypted data
      const combined = {
        encryptedKey: this.arrayBufferToBase64(encryptedKey),
        iv: this.arrayBufferToBase64(iv),
        encryptedData: this.arrayBufferToBase64(encryptedData)
      };
      
      return btoa(JSON.stringify(combined));
    } catch (error) {
      console.error('Lỗi mã hóa với public key:', error);
      throw new Error('Không thể mã hóa dữ liệu với public key');
    }
  }

  /**
   * Giải mã với private key
   */
  async decryptWithPrivateKey(
    encryptedData: string, 
    privateKey: CryptoKey
  ): Promise<string> {
    try {
      const combined = JSON.parse(atob(encryptedData));
      
      // Giải mã AES key với RSA private key
      const encryptedKeyBuffer = this.base64ToArrayBuffer(combined.encryptedKey);
      const aesKeyBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'RSA-OAEP'
        },
        privateKey,
        encryptedKeyBuffer
      );
      
      // Import AES key
      const aesKey = await window.crypto.subtle.importKey(
        'raw',
        aesKeyBuffer,
        {
          name: 'AES-GCM'
        },
        false,
        ['decrypt']
      );
      
      // Giải mã data với AES key
      const iv = this.base64ToArrayBuffer(combined.iv);
      const encryptedDataBuffer = this.base64ToArrayBuffer(combined.encryptedData);
      
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        aesKey,
        encryptedDataBuffer
      );
      
      const decoder = new TextDecoder();
      return decoder.decode(decryptedBuffer);
    } catch (error) {
      console.error('Lỗi giải mã với private key:', error);
      throw new Error('Không thể giải mã dữ liệu với private key');
    }
  }

  /**
   * Hash password cho authentication (không dùng để mã hóa)
   */
  async hashPassword(password: string, salt?: string): Promise<{ hash: string; salt: string }> {
    try {
      const encoder = new TextEncoder();
      const passwordBuffer = encoder.encode(password);
      
      // Tạo salt nếu chưa có
      const saltBuffer = salt 
        ? this.base64ToArrayBuffer(salt)
        : window.crypto.getRandomValues(new Uint8Array(16));
      
      // Hash với SHA-256
      const hashBuffer = await window.crypto.subtle.digest(
        'SHA-256',
        new Uint8Array([...passwordBuffer, ...new Uint8Array(saltBuffer)])
      );
      
      return {
        hash: this.arrayBufferToBase64(hashBuffer),
        salt: this.arrayBufferToBase64(saltBuffer)
      };
    } catch (error) {
      console.error('Lỗi hash password:', error);
      throw new Error('Không thể hash password');
    }
  }

  /**
   * Tạo secure random string cho tokens
   */
  generateSecureToken(length: number = 32): string {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Kiểm tra hỗ trợ Web Crypto API
   */
  isSupported(): boolean {
    return !!(window.crypto && window.crypto.subtle);
  }

  /**
   * Utility: ArrayBuffer to Base64
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * Utility: Base64 to ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  /**
   * Mã hóa transaction note
   */
  async encryptTransactionNote(
    note: string, 
    userPassword: string
  ): Promise<EncryptedData> {
    return this.encryptWithPassword(note, userPassword);
  }

  /**
   * Giải mã transaction note
   */
  async decryptTransactionNote(
    encryptedNote: EncryptedData, 
    userPassword: string
  ): Promise<string> {
    return this.decryptWithPassword(encryptedNote, userPassword);
  }

  /**
   * Mã hóa dữ liệu cá nhân nhạy cảm
   */
  async encryptPersonalData(
    data: Record<string, any>, 
    password: string
  ): Promise<EncryptedData> {
    const jsonString = JSON.stringify(data);
    return this.encryptWithPassword(jsonString, password);
  }

  /**
   * Giải mã dữ liệu cá nhân
   */
  async decryptPersonalData(
    encryptedData: EncryptedData, 
    password: string
  ): Promise<Record<string, any>> {
    const jsonString = await this.decryptWithPassword(encryptedData, password);
    return JSON.parse(jsonString);
  }
}

// Export singleton instance
export default new EncryptionService();

// Export types
export type { EncryptedData, KeyPair };
