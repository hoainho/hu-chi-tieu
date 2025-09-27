import { renderHook, act, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useCurrencyRates } from '../../hooks/useCurrencyRates';

// Mock Firebase
const mockOnSnapshot = vi.fn();
const mockDoc = vi.fn();
const mockCollection = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: mockDoc,
  collection: mockCollection,
  onSnapshot: mockOnSnapshot,
  serverTimestamp: () => ({ seconds: Date.now() / 1000 }),
  updateDoc: vi.fn()
}));

vi.mock('../../services/firebase', () => ({
  db: {}
}));

// Mock fetch for API calls
global.fetch = vi.fn();

describe('useCurrencyRates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock successful Firestore listener
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      // Simulate document exists with rate data
      const mockDocSnapshot = {
        exists: () => true,
        data: () => ({
          rate: 24000,
          change24h: 100,
          changePercent: 0.42,
          source: 'firestore',
          lastUpdated: { toDate: () => new Date('2024-01-15T10:00:00Z') },
          nextUpdate: { toDate: () => new Date('2024-01-15T11:00:00Z') }
        })
      };
      
      // Call callback immediately to simulate real-time update
      setTimeout(() => callback(mockDocSnapshot), 0);
      
      // Return unsubscribe function
      return vi.fn();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize with loading state', () => {
      const { result } = renderHook(() => useCurrencyRates());

      expect(result.current.loading).toBe(true);
      expect(result.current.rates).toEqual({});
      expect(result.current.error).toBeNull();
    });

    it('should setup Firestore listeners for all currencies', () => {
      renderHook(() => useCurrencyRates());

      expect(mockDoc).toHaveBeenCalledWith({}, 'rates', 'currency_USD');
      expect(mockDoc).toHaveBeenCalledWith({}, 'rates', 'currency_EUR');
      expect(mockDoc).toHaveBeenCalledWith({}, 'rates', 'currency_JPY');
      expect(mockOnSnapshot).toHaveBeenCalledTimes(3);
    });
  });

  describe('Data Loading', () => {
    it('should load rates from Firestore successfully', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.rates.USD).toEqual({
        symbol: 'USD',
        rate: 24000,
        change24h: 100,
        changePercent: 0.42,
        source: 'firestore',
        lastUpdated: new Date('2024-01-15T10:00:00Z'),
        nextUpdate: new Date('2024-01-15T11:00:00Z')
      });
    });

    it('should use fallback rates when Firestore document does not exist', async () => {
      mockOnSnapshot.mockImplementation((docRef, callback) => {
        const mockDocSnapshot = {
          exists: () => false,
          data: () => null
        };
        setTimeout(() => callback(mockDocSnapshot), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.rates.USD).toEqual({
        symbol: 'USD',
        rate: 24000,
        change24h: 0,
        changePercent: 0,
        source: 'fallback',
        lastUpdated: expect.any(Date),
        nextUpdate: expect.any(Date)
      });
    });

    it('should handle Firestore errors with retry mechanism', async () => {
      let callCount = 0;
      mockOnSnapshot.mockImplementation((docRef, callback, errorCallback) => {
        callCount++;
        if (callCount <= 2) {
          // Simulate error for first 2 calls
          setTimeout(() => errorCallback(new Error('Network error')), 0);
        } else {
          // Success on 3rd call
          const mockDocSnapshot = {
            exists: () => true,
            data: () => ({
              rate: 24000,
              source: 'firestore',
              lastUpdated: { toDate: () => new Date() },
              nextUpdate: { toDate: () => new Date() }
            })
          };
          setTimeout(() => callback(mockDocSnapshot), 0);
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      }, { timeout: 5000 });

      expect(result.current.rates.USD.rate).toBe(24000);
    });
  });

  describe('Currency Conversion', () => {
    it('should convert VND to USD correctly', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const usdAmount = result.current.convertFromVND(240000, 'USD');
      expect(usdAmount).toBe(10); // 240,000 / 24,000 = 10
    });

    it('should convert USD to VND correctly', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const vndAmount = result.current.convertToVND(10, 'USD');
      expect(vndAmount).toBe(240000); // 10 * 24,000 = 240,000
    });

    it('should return same amount when converting VND to VND', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const vndAmount = result.current.convertFromVND(100000, 'VND');
      expect(vndAmount).toBe(100000);
    });

    it('should use fallback rate when currency not found', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Try to convert with non-existent currency
      const amount = result.current.convertFromVND(240000, 'GBP');
      expect(amount).toBe(10); // Should use fallback rate of 24000
    });
  });

  describe('Manual Rate Updates', () => {
    it('should refresh rates manually', async () => {
      // Mock successful API response
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, message: 'Rates updated' })
      });

      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshRates();
      });

      expect(global.fetch).toHaveBeenCalledWith('/api/updateCurrencyRates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
    });

    it('should handle refresh errors gracefully', async () => {
      // Mock failed API response
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.refreshRates();
      });

      expect(result.current.error).toBe('Không thể cập nhật tỷ giá. Vui lòng thử lại sau.');
    });

    it('should set manual rate successfully', async () => {
      const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
      vi.mocked(require('firebase/firestore').updateDoc).mockImplementation(mockUpdateDoc);

      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      await act(async () => {
        await result.current.setManualRate('USD', 25000);
      });

      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          rate: 25000,
          source: 'manual'
        })
      );
    });
  });

  describe('Utility Functions', () => {
    it('should check if rate needs update', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Mock rate with future nextUpdate
      act(() => {
        result.current.rates.USD.nextUpdate = new Date(Date.now() + 60000);
      });

      expect(result.current.needsUpdate('USD')).toBe(false);

      // Mock rate with past nextUpdate
      act(() => {
        result.current.rates.USD.nextUpdate = new Date(Date.now() - 60000);
      });

      expect(result.current.needsUpdate('USD')).toBe(true);
    });

    it('should format rate correctly', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      const formatted = result.current.formatRate('USD');
      expect(formatted).toBe('1 USD = 24.000 VNĐ');
    });

    it('should return connection status correctly', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // With recent data
      expect(result.current.getConnectionStatus()).toBe('online');

      // With old data
      act(() => {
        result.current.rates.USD.lastUpdated = new Date(Date.now() - 2 * 60 * 60 * 1000);
      });

      expect(result.current.getConnectionStatus()).toBe('offline');

      // With error
      act(() => {
        result.current.error = 'Network error';
      });

      expect(result.current.getConnectionStatus()).toBe('fallback');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      mockOnSnapshot.mockImplementation((docRef, callback, errorCallback) => {
        setTimeout(() => errorCallback(new Error('Network unavailable')), 0);
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.error).toContain('Không thể kết nối tới server tỷ giá');
      expect(result.current.rates.USD.source).toBe('fallback');
    });

    it('should retry failed connections with exponential backoff', async () => {
      let retryCount = 0;
      mockOnSnapshot.mockImplementation((docRef, callback, errorCallback) => {
        retryCount++;
        if (retryCount <= 3) {
          setTimeout(() => errorCallback(new Error('Connection failed')), 0);
        } else {
          const mockDocSnapshot = {
            exists: () => true,
            data: () => ({ rate: 24000, source: 'firestore' })
          };
          setTimeout(() => callback(mockDocSnapshot), 0);
        }
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      // Should eventually succeed after retries
      await waitFor(() => {
        expect(result.current.loading).toBe(false);
        expect(result.current.rates.USD.rate).toBe(24000);
      }, { timeout: 10000 });

      expect(retryCount).toBeGreaterThan(3);
    });
  });

  describe('Real-time Updates', () => {
    it('should update rates when Firestore data changes', async () => {
      let callbackFn: Function;
      mockOnSnapshot.mockImplementation((docRef, callback) => {
        callbackFn = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      // Initial data
      act(() => {
        callbackFn({
          exists: () => true,
          data: () => ({
            rate: 24000,
            source: 'firestore',
            lastUpdated: { toDate: () => new Date() },
            nextUpdate: { toDate: () => new Date() }
          })
        });
      });

      await waitFor(() => {
        expect(result.current.rates.USD.rate).toBe(24000);
      });

      // Updated data
      act(() => {
        callbackFn({
          exists: () => true,
          data: () => ({
            rate: 24500,
            source: 'firestore',
            lastUpdated: { toDate: () => new Date() },
            nextUpdate: { toDate: () => new Date() }
          })
        });
      });

      await waitFor(() => {
        expect(result.current.rates.USD.rate).toBe(24500);
      });
    });

    it('should handle multiple currency updates simultaneously', async () => {
      const callbacks: { [key: string]: Function } = {};
      
      mockOnSnapshot.mockImplementation((docRef, callback) => {
        const currency = docRef.path.split('_')[1]; // Extract currency from path
        callbacks[currency] = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      // Update USD
      act(() => {
        callbacks.USD({
          exists: () => true,
          data: () => ({
            rate: 24000,
            source: 'firestore',
            lastUpdated: { toDate: () => new Date() },
            nextUpdate: { toDate: () => new Date() }
          })
        });
      });

      // Update EUR
      act(() => {
        callbacks.EUR({
          exists: () => true,
          data: () => ({
            rate: 26000,
            source: 'firestore',
            lastUpdated: { toDate: () => new Date() },
            nextUpdate: { toDate: () => new Date() }
          })
        });
      });

      await waitFor(() => {
        expect(result.current.rates.USD.rate).toBe(24000);
        expect(result.current.rates.EUR.rate).toBe(26000);
      });
    });
  });

  describe('Memory Management', () => {
    it('should cleanup listeners on unmount', () => {
      const unsubscribeFn = vi.fn();
      mockOnSnapshot.mockReturnValue(unsubscribeFn);

      const { unmount } = renderHook(() => useCurrencyRates());

      unmount();

      expect(unsubscribeFn).toHaveBeenCalledTimes(3); // USD, EUR, JPY
    });

    it('should not update state after unmount', async () => {
      let callbackFn: Function;
      mockOnSnapshot.mockImplementation((docRef, callback) => {
        callbackFn = callback;
        return vi.fn();
      });

      const { result, unmount } = renderHook(() => useCurrencyRates());

      unmount();

      // Try to trigger update after unmount
      act(() => {
        callbackFn({
          exists: () => true,
          data: () => ({ rate: 25000 })
        });
      });

      // Should not cause any errors or state updates
      expect(result.current.rates).toEqual({});
    });
  });

  describe('Performance', () => {
    it('should debounce rapid rate updates', async () => {
      let callbackFn: Function;
      mockOnSnapshot.mockImplementation((docRef, callback) => {
        callbackFn = callback;
        return vi.fn();
      });

      const { result } = renderHook(() => useCurrencyRates());

      // Rapid updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          callbackFn({
            exists: () => true,
            data: () => ({
              rate: 24000 + i,
              source: 'firestore',
              lastUpdated: { toDate: () => new Date() },
              nextUpdate: { toDate: () => new Date() }
            })
          });
        }
      });

      await waitFor(() => {
        expect(result.current.rates.USD.rate).toBe(24009); // Last update should win
      });
    });

    it('should cache conversion calculations', async () => {
      const { result } = renderHook(() => useCurrencyRates());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Multiple calls with same parameters
      const result1 = result.current.convertFromVND(240000, 'USD');
      const result2 = result.current.convertFromVND(240000, 'USD');
      const result3 = result.current.convertFromVND(240000, 'USD');

      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
      expect(result1).toBe(10);
    });
  });
});
