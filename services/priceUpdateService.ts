import { Timestamp } from 'firebase/firestore';

interface PriceSource {
  name: string;
  baseUrl: string;
  apiKey?: string;
  rateLimit: number; // requests per minute
  supportedAssets: string[];
}

interface PriceData {
  symbol: string;
  price: number; // VNĐ
  change24h: number;
  changePercent: number;
  volume24h?: number;
  marketCap?: number;
  lastUpdated: number;
}

class PriceUpdateService {
  private readonly sources: Record<string, PriceSource> = {
    coingecko: {
      name: 'CoinGecko',
      baseUrl: 'https://api.coingecko.com/api/v3',
      rateLimit: 50, // 50 calls/minute free tier
      supportedAssets: ['bitcoin', 'ethereum', 'binancecoin', 'cardano']
    },
    alphavantage: {
      name: 'Alpha Vantage',
      baseUrl: 'https://www.alphavantage.co/query',
      apiKey: process.env.ALPHA_VANTAGE_KEY,
      rateLimit: 5, // 5 calls/minute free tier
      supportedAssets: ['AAPL', 'GOOGL', 'MSFT', 'TSLA']
    },
    vnstock: {
      name: 'VN Stock API',
      baseUrl: 'https://api.vietstock.vn',
      rateLimit: 100,
      supportedAssets: ['VNM', 'VIC', 'VCB', 'HPG', 'MSN']
    }
  };

  private cache = new Map<string, { data: PriceData; expiry: number }>();
  private requestQueue: Array<{ symbol: string; resolve: Function; reject: Function }> = [];
  private isProcessing = false;

  /**
   * Lấy giá crypto từ CoinGecko (VNĐ)
   */
  async getCryptoPrices(symbols: string[]): Promise<PriceData[]> {
    const coinIds = symbols.map(s => this.mapSymbolToCoinId(s));
    const url = `${this.sources.coingecko.baseUrl}/simple/price?ids=${coinIds.join(',')}&vs_currencies=vnd&include_24hr_change=true&include_24hr_vol=true&include_market_cap=true`;

    try {
      const response = await this.fetchWithRetry(url);
      const data = await response.json();
      
      return Object.entries(data).map(([coinId, priceInfo]: [string, any]) => ({
        symbol: this.mapCoinIdToSymbol(coinId),
        price: priceInfo.vnd,
        change24h: priceInfo.vnd_24h_change || 0,
        changePercent: priceInfo.vnd_24h_change || 0,
        volume24h: priceInfo.vnd_24h_vol,
        marketCap: priceInfo.vnd_market_cap,
        lastUpdated: Date.now()
      }));
    } catch (error) {
      console.error('Lỗi lấy giá crypto:', error);
      return this.getFallbackPrices(symbols);
    }
  }

  /**
   * Lấy giá chứng khoán Việt Nam
   */
  async getVNStockPrices(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    
    for (const symbol of symbols) {
      try {
        // API VietStock hoặc SSI
        const url = `${this.sources.vnstock.baseUrl}/stocks/${symbol}/price`;
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        results.push({
          symbol,
          price: data.price * 1000, // Chuyển từ nghìn VNĐ sang VNĐ
          change24h: data.change,
          changePercent: data.changePercent,
          volume24h: data.volume,
          lastUpdated: Date.now()
        });
        
        // Delay để tránh rate limit
        await this.delay(200);
      } catch (error) {
        console.error(`Lỗi lấy giá ${symbol}:`, error);
        results.push(this.getFallbackPrice(symbol));
      }
    }
    
    return results;
  }

  /**
   * Lấy giá chứng khoán US từ Alpha Vantage
   */
  async getUSStockPrices(symbols: string[]): Promise<PriceData[]> {
    const results: PriceData[] = [];
    const usdToVnd = await this.getUSDToVNDRate();
    
    for (const symbol of symbols) {
      try {
        const url = `${this.sources.alphavantage.baseUrl}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.sources.alphavantage.apiKey}`;
        const response = await this.fetchWithRetry(url);
        const data = await response.json();
        
        const quote = data['Global Quote'];
        const priceUSD = parseFloat(quote['05. price']);
        const changePercent = parseFloat(quote['10. change percent'].replace('%', ''));
        
        results.push({
          symbol,
          price: priceUSD * usdToVnd,
          change24h: (priceUSD * changePercent / 100) * usdToVnd,
          changePercent,
          lastUpdated: Date.now()
        });
        
        // Alpha Vantage có rate limit nghiêm ngặt
        await this.delay(12000); // 5 calls/minute = 12s/call
      } catch (error) {
        console.error(`Lỗi lấy giá ${symbol}:`, error);
        results.push(this.getFallbackPrice(symbol));
      }
    }
    
    return results;
  }

  /**
   * Batch update giá với queue system
   */
  async batchUpdatePrices(investments: Array<{ symbol: string; type: string }>): Promise<void> {
    const cryptoSymbols = investments.filter(i => i.type === 'crypto').map(i => i.symbol);
    const vnStockSymbols = investments.filter(i => i.type === 'stock' && this.isVNStock(i.symbol)).map(i => i.symbol);
    const usStockSymbols = investments.filter(i => i.type === 'stock' && !this.isVNStock(i.symbol)).map(i => i.symbol);

    const [cryptoPrices, vnStockPrices, usStockPrices] = await Promise.allSettled([
      cryptoSymbols.length > 0 ? this.getCryptoPrices(cryptoSymbols) : Promise.resolve([]),
      vnStockSymbols.length > 0 ? this.getVNStockPrices(vnStockSymbols) : Promise.resolve([]),
      usStockSymbols.length > 0 ? this.getUSStockPrices(usStockSymbols) : Promise.resolve([])
    ]);

    // Lưu vào cache và Firestore
    const allPrices = [
      ...(cryptoPrices.status === 'fulfilled' ? cryptoPrices.value : []),
      ...(vnStockPrices.status === 'fulfilled' ? vnStockPrices.value : []),
      ...(usStockPrices.status === 'fulfilled' ? usStockPrices.value : [])
    ];

    await this.savePricesToFirestore(allPrices);
    this.updateLocalCache(allPrices);
  }

  /**
   * Lấy tỷ giá USD/VND
   */
  private async getUSDToVNDRate(): Promise<number> {
    try {
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      return data.rates.VND || 24000; // Fallback 24,000 VNĐ
    } catch {
      return 24000; // Default rate
    }
  }

  /**
   * Retry logic với exponential backoff
   */
  private async fetchWithRetry(url: string, maxRetries = 3): Promise<Response> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'HuTaiChinhCouples/1.0'
          }
        });
        
        if (response.ok) return response;
        
        if (response.status === 429) {
          // Rate limited - wait longer
          await this.delay(Math.pow(2, i) * 2000);
          continue;
        }
        
        throw new Error(`HTTP ${response.status}`);
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        await this.delay(Math.pow(2, i) * 1000);
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  /**
   * Fallback prices khi API fail
   */
  private getFallbackPrices(symbols: string[]): PriceData[] {
    const fallbackData: Record<string, number> = {
      'BTC': 2100000000, // 2.1 tỷ VNĐ
      'ETH': 85000000,   // 85 triệu VNĐ
      'VNM': 220000,     // 220k VNĐ
      'VIC': 2200000,    // 2.2 triệu VNĐ
      'VCB': 2000000,    // 2 triệu VNĐ
      'AAPL': 4500000,   // 4.5 triệu VNĐ
    };

    return symbols.map(symbol => ({
      symbol,
      price: fallbackData[symbol] || 0,
      change24h: 0,
      changePercent: 0,
      lastUpdated: Date.now()
    }));
  }

  private getFallbackPrice(symbol: string): PriceData {
    return this.getFallbackPrices([symbol])[0];
  }

  private mapSymbolToCoinId(symbol: string): string {
    const mapping: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'BNB': 'binancecoin',
      'ADA': 'cardano'
    };
    return mapping[symbol] || symbol.toLowerCase();
  }

  private mapCoinIdToSymbol(coinId: string): string {
    const mapping: Record<string, string> = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'binancecoin': 'BNB',
      'cardano': 'ADA'
    };
    return mapping[coinId] || coinId.toUpperCase();
  }

  private isVNStock(symbol: string): boolean {
    const vnStocks = ['VNM', 'VIC', 'VCB', 'HPG', 'MSN', 'CTG', 'BID', 'TCB'];
    return vnStocks.includes(symbol);
  }

  private async savePricesToFirestore(prices: PriceData[]): Promise<void> {
    // Implementation sẽ save vào collection 'rates'
    // Batch write để tối ưu performance
  }

  private updateLocalCache(prices: PriceData[]): void {
    const expiry = Date.now() + (30 * 60 * 1000); // 30 phút
    prices.forEach(price => {
      this.cache.set(price.symbol, { data: price, expiry });
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default new PriceUpdateService();
