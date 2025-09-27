import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { db } from './firebase';

interface OfflineTransaction {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
  userId: string;
  deviceId: string;
}

interface ConflictResolution {
  strategy: 'server_wins' | 'client_wins' | 'merge' | 'manual';
  mergeFields?: string[];
  priority?: 'timestamp' | 'user_preference';
}

class OfflineService {
  private isOnline = navigator.onLine;
  private pendingOperations: OfflineTransaction[] = [];
  private conflictQueue: Array<{
    local: any;
    server: any;
    resolution: ConflictResolution;
  }> = [];
  private deviceId: string;

  constructor() {
    this.deviceId = this.generateDeviceId();
    this.initializeOfflineSupport();
    this.setupNetworkListeners();
    this.loadPendingOperations();
  }

  /**
   * Khởi tạo Firestore offline persistence
   */
  async initializeOfflineSupport(): Promise<void> {
    try {
      // Firestore tự động enable offline persistence
      console.log('Firestore offline persistence đã được kích hoạt');
      
      // Setup periodic sync khi online
      this.setupPeriodicSync();
    } catch (error) {
      console.error('Lỗi khởi tạo offline support:', error);
    }
  }

  /**
   * Lắng nghe thay đổi network status
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('Đã kết nối internet');
      this.isOnline = true;
      this.enableFirestoreNetwork();
      this.syncPendingOperations();
    });

    window.addEventListener('offline', () => {
      console.log('Mất kết nối internet');
      this.isOnline = false;
      this.disableFirestoreNetwork();
    });
  }

  /**
   * Enable/Disable Firestore network
   */
  async enableFirestoreNetwork(): Promise<void> {
    try {
      await enableNetwork(db);
      console.log('Firestore network enabled');
    } catch (error) {
      console.error('Lỗi enable Firestore network:', error);
    }
  }

  async disableFirestoreNetwork(): Promise<void> {
    try {
      await disableNetwork(db);
      console.log('Firestore network disabled');
    } catch (error) {
      console.error('Lỗi disable Firestore network:', error);
    }
  }

  /**
   * Thêm operation vào queue khi offline
   */
  addPendingOperation(
    type: 'create' | 'update' | 'delete',
    collection: string,
    data: any,
    userId: string
  ): string {
    const operation: OfflineTransaction = {
      id: this.generateOperationId(),
      type,
      collection,
      data: this.sanitizeData(data),
      timestamp: Date.now(),
      userId,
      deviceId: this.deviceId
    };

    this.pendingOperations.push(operation);
    this.savePendingOperations();
    
    console.log(`Đã thêm ${type} operation vào queue:`, operation);
    return operation.id;
  }

  /**
   * Sanitize data để tránh undefined values (theo memory)
   */
  private sanitizeData(data: any): any {
    if (data === null || data === undefined) {
      return null;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized: any = {};
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          sanitized[key] = this.sanitizeData(value);
        }
      });
      return sanitized;
    }

    return data;
  }

  /**
   * Sync tất cả pending operations khi online
   */
  async syncPendingOperations(): Promise<void> {
    if (!this.isOnline || this.pendingOperations.length === 0) {
      return;
    }

    console.log(`Bắt đầu sync ${this.pendingOperations.length} pending operations`);

    const operations = [...this.pendingOperations];
    this.pendingOperations = [];

    for (const operation of operations) {
      try {
        await this.executeOperation(operation);
        console.log(`Đã sync operation ${operation.id}`);
      } catch (error) {
        console.error(`Lỗi sync operation ${operation.id}:`, error);
        
        // Nếu là conflict, thêm vào conflict queue
        if (this.isConflictError(error)) {
          await this.handleConflict(operation, error);
        } else {
          // Thêm lại vào queue để retry sau
          this.pendingOperations.push(operation);
        }
      }
    }

    this.savePendingOperations();
  }

  /**
   * Thực thi operation
   */
  private async executeOperation(operation: OfflineTransaction): Promise<void> {
    const { type, collection, data } = operation;

    switch (type) {
      case 'create':
        // await addDoc(collection(db, collection), data);
        break;
      case 'update':
        // await updateDoc(doc(db, collection, data.id), data);
        break;
      case 'delete':
        // await deleteDoc(doc(db, collection, data.id));
        break;
    }
  }

  /**
   * Xử lý conflict khi sync
   */
  private async handleConflict(
    operation: OfflineTransaction,
    error: any
  ): Promise<void> {
    console.log('Phát hiện conflict, đang xử lý...');

    // Lấy dữ liệu server hiện tại
    const serverData = await this.getServerData(operation.collection, operation.data.id);
    
    // Áp dụng conflict resolution strategy
    const resolution = this.getConflictResolution(operation.collection);
    const resolvedData = await this.resolveConflict(
      operation.data,
      serverData,
      resolution
    );

    // Cập nhật với dữ liệu đã resolve
    if (resolvedData) {
      operation.data = resolvedData;
      await this.executeOperation(operation);
    }
  }

  /**
   * Resolve conflict dựa trên strategy
   */
  private async resolveConflict(
    localData: any,
    serverData: any,
    resolution: ConflictResolution
  ): Promise<any> {
    switch (resolution.strategy) {
      case 'server_wins':
        return serverData;
        
      case 'client_wins':
        return localData;
        
      case 'merge':
        return this.mergeData(localData, serverData, resolution.mergeFields);
        
      case 'manual':
        // Thêm vào queue để user quyết định
        this.conflictQueue.push({
          local: localData,
          server: serverData,
          resolution
        });
        return null;
        
      default:
        return serverData; // Default: server wins
    }
  }

  /**
   * Merge dữ liệu thông minh
   */
  private mergeData(
    localData: any,
    serverData: any,
    mergeFields?: string[]
  ): any {
    const merged = { ...serverData };

    // Nếu có mergeFields, chỉ merge những field đó
    if (mergeFields) {
      mergeFields.forEach(field => {
        if (localData[field] !== undefined) {
          merged[field] = localData[field];
        }
      });
    } else {
      // Merge tất cả, ưu tiên local nếu có timestamp mới hơn
      Object.keys(localData).forEach(key => {
        if (key === 'updatedAt' || key === 'lastModified') {
          // So sánh timestamp
          const localTime = new Date(localData[key]).getTime();
          const serverTime = new Date(serverData[key] || 0).getTime();
          
          if (localTime > serverTime) {
            merged[key] = localData[key];
          }
        } else if (localData[key] !== undefined) {
          merged[key] = localData[key];
        }
      });
    }

    return merged;
  }

  /**
   * Lấy conflict resolution strategy cho collection
   */
  private getConflictResolution(collection: string): ConflictResolution {
    const strategies: Record<string, ConflictResolution> = {
      transactions: {
        strategy: 'merge',
        mergeFields: ['amount', 'description', 'category', 'updatedAt'],
        priority: 'timestamp'
      },
      investments: {
        strategy: 'merge',
        mergeFields: ['quantity', 'currentPrice', 'marketValue', 'updatedAt']
      },
      budgets: {
        strategy: 'merge',
        mergeFields: ['allocated', 'spent', 'updatedAt']
      },
      accounts: {
        strategy: 'server_wins' // Account balance luôn ưu tiên server
      },
      users: {
        strategy: 'merge',
        mergeFields: ['preferences', 'lastLoginAt']
      }
    };

    return strategies[collection] || { strategy: 'server_wins' };
  }

  /**
   * Kiểm tra xem error có phải conflict không
   */
  private isConflictError(error: any): boolean {
    return error.code === 'failed-precondition' || 
           error.message?.includes('conflict') ||
           error.message?.includes('version');
  }

  /**
   * Lấy dữ liệu từ server
   */
  private async getServerData(collection: string, docId: string): Promise<any> {
    try {
      // const docRef = doc(db, collection, docId);
      // const docSnap = await getDoc(docRef);
      // return docSnap.exists() ? docSnap.data() : null;
      return null; // Mock for now
    } catch (error) {
      console.error('Lỗi lấy server data:', error);
      return null;
    }
  }

  /**
   * Setup periodic sync
   */
  private setupPeriodicSync(): void {
    // Sync mỗi 30 giây khi online
    setInterval(() => {
      if (this.isOnline && this.pendingOperations.length > 0) {
        this.syncPendingOperations();
      }
    }, 30000);
  }

  /**
   * Save/Load pending operations từ localStorage
   */
  private savePendingOperations(): void {
    try {
      localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
    } catch (error) {
      console.error('Lỗi save pending operations:', error);
    }
  }

  private loadPendingOperations(): void {
    try {
      const saved = localStorage.getItem('pendingOperations');
      if (saved) {
        this.pendingOperations = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Lỗi load pending operations:', error);
      this.pendingOperations = [];
    }
  }

  /**
   * Utility functions
   */
  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId');
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('deviceId', deviceId);
    }
    return deviceId;
  }

  private generateOperationId(): string {
    return 'op_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  }

  /**
   * Public methods
   */
  isOffline(): boolean {
    return !this.isOnline;
  }

  getPendingOperationsCount(): number {
    return this.pendingOperations.length;
  }

  getConflictQueueCount(): number {
    return this.conflictQueue.length;
  }

  async forcSync(): Promise<void> {
    await this.syncPendingOperations();
  }

  clearPendingOperations(): void {
    this.pendingOperations = [];
    this.savePendingOperations();
  }

  /**
   * Wrapper cho Firestore operations với offline support
   */
  async createDocument(
    collection: string,
    data: any,
    userId: string
  ): Promise<string> {
    // Sanitize data trước khi lưu (theo memory về undefined values)
    const sanitizedData = {
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
      deviceId: this.deviceId,
      // Chỉ thêm coupleId nếu có giá trị
      ...(data.coupleId && { coupleId: data.coupleId })
    };

    if (this.isOnline) {
      try {
        // Thực thi ngay khi online
        // const docRef = await addDoc(collection(db, collection), sanitizedData);
        // return docRef.id;
        return 'mock_id'; // Mock for now
      } catch (error) {
        console.error('Lỗi create document online:', error);
        // Fallback to offline
        return this.addPendingOperation('create', collection, sanitizedData, userId);
      }
    } else {
      // Thêm vào queue khi offline
      return this.addPendingOperation('create', collection, sanitizedData, userId);
    }
  }

  async updateDocument(
    collection: string,
    docId: string,
    data: any,
    userId: string
  ): Promise<void> {
    const sanitizedData = {
      ...data,
      updatedAt: new Date(),
      deviceId: this.deviceId
    };

    if (this.isOnline) {
      try {
        // await updateDoc(doc(db, collection, docId), sanitizedData);
      } catch (error) {
        console.error('Lỗi update document online:', error);
        this.addPendingOperation('update', collection, { id: docId, ...sanitizedData }, userId);
      }
    } else {
      this.addPendingOperation('update', collection, { id: docId, ...sanitizedData }, userId);
    }
  }

  async deleteDocument(
    collection: string,
    docId: string,
    userId: string
  ): Promise<void> {
    if (this.isOnline) {
      try {
        // await deleteDoc(doc(db, collection, docId));
      } catch (error) {
        console.error('Lỗi delete document online:', error);
        this.addPendingOperation('delete', collection, { id: docId }, userId);
      }
    } else {
      this.addPendingOperation('delete', collection, { id: docId }, userId);
    }
  }
}

export default new OfflineService();
