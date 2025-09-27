import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import db from './firebase';
import { CurrencyRates, CurrencyRate, SupportedCurrency } from '../types';

interface RateResponse {
  rates: CurrencyRates;
  lastUpdated: number;
  source: string;
}

class CurrencyService {
  private cache = new Map<string, { rate: number; expires: number }>();
  private retryCount = 0;
  private maxRetries = 3;
  private baseUrl = 'https://api.coingecko.com/api/v3/simple/price';
  
  async getRates(currencies: SupportedCurrency[] = ['USD', 'EUR', 'JPY']): Promise<RateResponse> {
    try {
      // Check cache first
      const cached = this.getCachedRates(currencies);
      if (cached) return cached;
      
      // Fetch from API with circuit breaker
      const response = await this.fetchWithRetry(currencies);
      await this.cacheRates(response.rates);
      return response;
      
    } catch (error) {
      console.error('Currency service error:', error);
      // Fallback to last known rates
      return this.getFallbackRates(currencies);
    }
  }
  
  private getCachedRates(currencies: SupportedCurrency[]): RateResponse | null {
    const now = Date.now();
    const cachedRates: CurrencyRates = {};
    
    for (const currency of currencies) {
      const cached = this.cache.get(currency);
      if (cached && cached.expires > now) {
        cachedRates[currency] = {
          rate: cached.rate,
          lastUpdated: now,
          source: 'cache'
        };
      } else {
        return null; // If any currency is not cached or expired, fetch all
      }
    }
    
    return {
      rates: cachedRates,
      lastUpdated: now,
      source: 'cache'
    };
  }
  
  private async fetchWithRetry(currencies: SupportedCurrency[]): Promise<RateResponse> {
    const backoffMs = Math.pow(2, this.retryCount) * 1000;
    
    try {
      // Map currencies to CoinGecko IDs
      const coinGeckoIds = currencies
        .filter(c => c !== 'VND')
        .map(c => this.getCoinGeckoId(c))
        .join(',');
      
      if (!coinGeckoIds) {
        throw new Error('No valid currencies to fetch');
      }
      
      const url = `${this.baseUrl}?ids=${coinGeckoIds}&vs_currencies=vnd`;
      const response = await fetch(url, { 
        signal: AbortSignal.timeout(10000),
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HuChiTieu/1.0'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      this.retryCount = 0; // Reset on success
      
      const rates = this.transformRates(data, currencies);
      
      return {
        rates,
        lastUpdated: Date.now(),
        source: 'coingecko'
      };
      
    } catch (error) {
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.warn(`Retry ${this.retryCount}/${this.maxRetries} after ${backoffMs}ms`);
        await new Promise(resolve => setTimeout(resolve, backoffMs));
        return this.fetchWithRetry(currencies);
      }
      throw error;
    }
  }
  
  private getCoinGeckoId(currency: SupportedCurrency): string {
    const mapping: Record<SupportedCurrency, string> = {
      'VND': '',
      'USD': 'usd',
      'EUR': 'eur', 
      'JPY': 'japanese-yen'
    };
    return mapping[currency];
  }
  
  private transformRates(data: any, currencies: SupportedCurrency[]): CurrencyRates {
    const rates: CurrencyRates = {};
    
    // VND is always 1:1 with itself
    if (currencies.includes('VND')) {
      rates['VND'] = {
        rate: 1,
        lastUpdated: Date.now(),
        source: 'base'
      };
    }
    
    // Transform CoinGecko response
    Object.entries(data).forEach(([coinId, values]: [string, any]) => {
      const currency = this.getCurrencyFromCoinId(coinId);
      if (currency && currencies.includes(currency) && values.vnd) {
        rates[currency] = {
          rate: values.vnd,
          lastUpdated: Date.now(),
          source: 'coingecko'
        };
      }
    });
    
    return rates;
  }
  
  private getCurrencyFromCoinId(coinId: string): SupportedCurrency | null {
    const mapping: Record<string, SupportedCurrency> = {
      'usd': 'USD',
      'eur': 'EUR',
      'japanese-yen': 'JPY'
    };
    return mapping[coinId] || null;
  }
  
  private async cacheRates(rates: CurrencyRates): Promise<void> {
    if (!db) return;
    
    const oneHour = 60 * 60 * 1000;
    const expires = Date.now() + oneHour;
    
    // Cache in memory
    Object.entries(rates).forEach(([currency, rate]) => {
      this.cache.set(currency, { rate: rate.rate, expires });
    });
    
    // Cache in Firestore
    try {
      const promises = Object.entries(rates).map(([currency, rate]) =>
        setDoc(doc(db, 'rates', currency), {
          ...rate,
          ttl: Timestamp.fromMillis(expires)
        })
      );
      await Promise.all(promises);
    } catch (error) {
      console.warn('Failed to cache rates in Firestore:', error);
    }
  }
  
  private async getFallbackRates(currencies: SupportedCurrency[]): Promise<RateResponse> {
    if (!db) {
      return this.getHardcodedFallback(currencies);
    }
    
    try {
      const promises = currencies.map(currency => 
        getDoc(doc(db, 'rates', currency))
      );
      const docs = await Promise.all(promises);
      
      const rates: CurrencyRates = {};
      docs.forEach((docSnap, index) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          rates[currencies[index]] = {
            rate: data.rate,
            lastUpdated: data.lastUpdated,
            source: data.source + '_fallback'
          };
        }
      });
      
      // If we have some cached rates, return them
      if (Object.keys(rates).length > 0) {
        return {
          rates,
          lastUpdated: Date.now(),
          source: 'firestore_fallback'
        };
      }
    } catch (error) {
      console.warn('Firestore fallback failed:', error);
    }
    
    return this.getHardcodedFallback(currencies);
  }
  
  private getHardcodedFallback(currencies: SupportedCurrency[]): RateResponse {
    const fallbackRates: Record<SupportedCurrency, number> = {
      'VND': 1,
      'USD': 24000,
      'EUR': 26000,
      'JPY': 160
    };
    
    const rates: CurrencyRates = {};
    currencies.forEach(currency => {
      rates[currency] = {
        rate: fallbackRates[currency],
        lastUpdated: Date.now(),
        source: 'hardcoded_fallback'
      };
    });
    
    return {
      rates,
      lastUpdated: Date.now(),
      source: 'hardcoded_fallback'
    };
  }
  
  async manualOverride(currency: SupportedCurrency, rate: number): Promise<void> {
    if (!db) throw new Error('Database not available');
    
    const overrideData: CurrencyRate = {
      rate,
      lastUpdated: Date.now(),
      source: 'manual_override',
      isManualOverride: true
    };
    
    await setDoc(doc(db, 'rates', currency), overrideData);
    
    // Update memory cache
    this.cache.set(currency, { 
      rate, 
      expires: Date.now() + (24 * 60 * 60 * 1000) // 24 hours for manual overrides
    });
  }
  
  convertToVND(amount: number, fromCurrency: SupportedCurrency, rates: CurrencyRates): number {
    if (fromCurrency === 'VND') return amount;
    const rate = rates[fromCurrency]?.rate || 1;
    return amount * rate;
  }
  
  convertFromVND(vndAmount: number, toCurrency: SupportedCurrency, rates: CurrencyRates): number {
    if (toCurrency === 'VND') return vndAmount;
    const rate = rates[toCurrency]?.rate || 1;
    return vndAmount / rate;
  }
}

export const currencyService = new CurrencyService();
export default currencyService;
