import { useState, useEffect, useCallback, useRef } from 'react';
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import  db  from '../services/firebase';

interface CurrencyRate {
  symbol: string;
  rate: number; // VNĐ per unit
  change24h: number;
  changePercent: number;
  source: string;
  lastUpdated: Date;
  nextUpdate: Date;
}

interface RateCache {
  [currency: string]: CurrencyRate;
}

interface UseCurrencyRatesReturn {
  rates: RateCache;
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  convertFromVND: (vndAmount: number, toCurrency: string) => number;
  convertToVND: (amount: number, fromCurrency: string) => number;
  refreshRates: () => Promise<void>;
  setManualRate: (currency: string, rate: number) => Promise<void>;
}

export const useCurrencyRates = (): UseCurrencyRatesReturn => {
  const [rates, setRates] = useState<RateCache>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const retryCount = useRef(0);
  const maxRetries = 3;
  const retryDelay = [1000, 3000, 5000]; // Exponential backoff

  // Fallback rates khi API fail
  const fallbackRates: RateCache = {
    USD: {
      symbol: 'USD',
      rate: 26700,
      change24h: 0,
      changePercent: 0,
      source: 'fallback',
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000)
    },
    EUR: {
      symbol: 'EUR',
      rate: 26000,
      change24h: 0,
      changePercent: 0,
      source: 'fallback',
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000)
    },
    JPY: {
      symbol: 'JPY',
      rate: 160,
      change24h: 0,
      changePercent: 0,
      source: 'fallback',
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 60 * 60 * 1000)
    }
  };

  /**
   * Lắng nghe realtime updates từ Firestore
   */
  useEffect(() => {
    const unsubscribers: Array<() => void> = [];
    
    const currencies = ['USD', 'EUR', 'JPY'];
    
    currencies.forEach(currency => {
      const rateDoc = doc(db, 'rates', `currency_${currency}`);
      
      const unsubscribe = onSnapshot(
        rateDoc,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const rateData: CurrencyRate = {
              symbol: currency,
              rate: data.rate,
              change24h: data.change24h || 0,
              changePercent: data.changePercent || 0,
              source: data.source || 'firestore',
              lastUpdated: data.lastUpdated?.toDate() || new Date(),
              nextUpdate: data.nextUpdate?.toDate() || new Date()
            };
            
            setRates(prev => ({
              ...prev,
              [currency]: rateData
            }));
            
            setLastUpdate(rateData.lastUpdated);
            setError(null);
            retryCount.current = 0;
          } else {
            // Không có dữ liệu, dùng fallback
            setRates(prev => ({
              ...prev,
              [currency]: fallbackRates[currency]
            }));
          }
          
          setLoading(false);
        },
        (err) => {
          console.error(`Lỗi lắng nghe tỷ giá ${currency}:`, err);
          
          // Retry với exponential backoff
          if (retryCount.current < maxRetries) {
            const delay = retryDelay[retryCount.current];
            setTimeout(() => {
              retryCount.current++;
              // Retry logic sẽ được xử lý bởi useEffect
            }, delay);
          } else {
            // Dùng fallback rates
            setRates(fallbackRates);
            setError(`Không thể kết nối tới server tỷ giá. Đang sử dụng tỷ giá dự phòng.`);
            setLoading(false);
          }
        }
      );
      
      unsubscribers.push(unsubscribe);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  /**
   * Chuyển đổi từ VNĐ sang ngoại tệ
   */
  const convertFromVND = useCallback((vndAmount: number, toCurrency: string): number => {
    if (toCurrency === 'VND') return vndAmount;
    
    const rate = rates[toCurrency]?.rate;
    if (!rate) {
      console.warn(`Không tìm thấy tỷ giá cho ${toCurrency}, dùng fallback`);
      return vndAmount / (fallbackRates[toCurrency]?.rate || 24000);
    }
    
    return vndAmount / rate;
  }, [rates]);

  /**
   * Chuyển đổi từ ngoại tệ sang VNĐ
   */
  const convertToVND = useCallback((amount: number, fromCurrency: string): number => {
    if (fromCurrency === 'VND') return amount;
    
    const rate = rates[fromCurrency]?.rate;
    if (!rate) {
      console.warn(`Không tìm thấy tỷ giá cho ${fromCurrency}, dùng fallback`);
      return amount * (fallbackRates[fromCurrency]?.rate || 24000);
    }
    
    return amount * rate;
  }, [rates]);

  /**
   * Refresh rates thủ công
   */
  const refreshRates = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    
    try {
      // Gọi Cloud Function để cập nhật tỷ giá
      const response = await fetch('/api/updateCurrencyRates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Không thể cập nhật tỷ giá');
      }
      
      const result = await response.json();
      console.log('Cập nhật tỷ giá thành công:', result);
      
    } catch (err) {
      console.error('Lỗi refresh tỷ giá:', err);
      setError('Không thể cập nhật tỷ giá. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Đặt tỷ giá thủ công (cho admin hoặc offline mode)
   */
  const setManualRate = useCallback(async (currency: string, rate: number): Promise<void> => {
    try {
      const rateDoc = doc(db, 'rates', `currency_${currency}`);
      
      await updateDoc(rateDoc, {
        rate,
        source: 'manual',
        lastUpdated: serverTimestamp(),
        nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 giờ
      });
      
      console.log(`Đã cập nhật tỷ giá ${currency}: ${rate.toLocaleString('vi-VN')} VNĐ`);
      
    } catch (err) {
      console.error('Lỗi cập nhật tỷ giá thủ công:', err);
      throw new Error('Không thể cập nhật tỷ giá thủ công');
    }
  }, []);

  /**
   * Kiểm tra xem tỷ giá có cần cập nhật không
   */
  const needsUpdate = useCallback((currency: string): boolean => {
    const rate = rates[currency];
    if (!rate) return true;
    
    return new Date() > rate.nextUpdate;
  }, [rates]);

  /**
   * Format tỷ giá theo chuẩn Việt Nam
   */
  const formatRate = useCallback((currency: string): string => {
    const rate = rates[currency];
    if (!rate) return 'N/A';
    
    return `1 ${currency} = ${rate.rate.toLocaleString('vi-VN')} VNĐ`;
  }, [rates]);

  /**
   * Lấy trạng thái kết nối
   */
  const getConnectionStatus = useCallback((): 'online' | 'offline' | 'fallback' => {
    if (error) return 'fallback';
    
    const hasRecentData = Object.values(rates).some(rate => {
      const timeDiff = Date.now() - rate.lastUpdated.getTime();
      return timeDiff < 60 * 60 * 1000; // Dữ liệu trong 1 giờ qua
    });
    
    return hasRecentData ? 'online' : 'offline';
  }, [rates, error]);

  return {
    rates,
    loading,
    error,
    lastUpdate,
    convertFromVND,
    convertToVND,
    refreshRates,
    setManualRate,
    // Thêm các utility functions
    needsUpdate,
    formatRate,
    getConnectionStatus
  } as UseCurrencyRatesReturn & {
    needsUpdate: (currency: string) => boolean;
    formatRate: (currency: string) => string;
    getConnectionStatus: () => 'online' | 'offline' | 'fallback';
  };
};
