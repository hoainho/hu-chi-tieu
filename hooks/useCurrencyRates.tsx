import { useState, useEffect, useCallback } from 'react';
import { CurrencyRates, SupportedCurrency } from '../types';
import currencyService from '../services/currencyService';

interface UseCurrencyRatesReturn {
  rates: CurrencyRates;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  manualOverride: (currency: SupportedCurrency, rate: number) => Promise<void>;
  convertToVND: (amount: number, fromCurrency: SupportedCurrency) => number;
  convertFromVND: (vndAmount: number, toCurrency: SupportedCurrency) => number;
}

export const useCurrencyRates = (
  currencies: SupportedCurrency[] = ['USD', 'EUR', 'JPY']
): UseCurrencyRatesReturn => {
  const [rates, setRates] = useState<CurrencyRates>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRates = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await currencyService.getRates(currencies);
      setRates(response.rates);

      // Log source for debugging
      console.log(`Currency rates loaded from: ${response.source}`);
      
    } catch (err) {
      console.error('Currency rates fetch failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch currency rates');
    } finally {
      setLoading(false);
    }
  }, [currencies]);

  const manualOverride = useCallback(async (currency: SupportedCurrency, rate: number) => {
    try {
      await currencyService.manualOverride(currency, rate);
      
      // Update local state
      setRates(prev => ({
        ...prev,
        [currency]: {
          rate,
          lastUpdated: Date.now(),
          source: 'manual_override',
          isManualOverride: true
        }
      }));
      
    } catch (err) {
      console.error('Manual override failed:', err);
      throw err;
    }
  }, []);

  const convertToVND = useCallback((amount: number, fromCurrency: SupportedCurrency): number => {
    return currencyService.convertToVND(amount, fromCurrency, rates);
  }, [rates]);

  const convertFromVND = useCallback((vndAmount: number, toCurrency: SupportedCurrency): number => {
    return currencyService.convertFromVND(vndAmount, toCurrency, rates);
  }, [rates]);

  useEffect(() => {
    fetchRates();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRates, 5 * 60 * 1000);
    
    // Refresh when window becomes visible (user returns to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchRates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchRates]);

  return { 
    rates, 
    loading, 
    error, 
    refetch: fetchRates, 
    manualOverride,
    convertToVND,
    convertFromVND
  };
};
