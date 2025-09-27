/**
 * Cryptocurrency Price Service
 * Uses CoinGecko API (no CORS issues) for real crypto prices
 */

export interface CryptoPrice {
  symbol: string;
  name: string;
  price: number; // USD
  change: number;
  changePercent: number;
  marketCap: number;
  lastUpdated: Date;
}

/**
 * CoinGecko API Service - NO CORS ISSUES
 */
class CryptoPriceService {
  private readonly baseUrl = 'https://api.coingecko.com/api/v3';
  private cache = new Map<string, { data: CryptoPrice[]; expiry: number }>();
  
  // Mapping crypto symbols to CoinGecko IDs
  private readonly cryptoIds: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'ADA': 'cardano',
    'DOT': 'polkadot',
    'MATIC': 'matic-network',
    'AVAX': 'avalanche-2',
    'LINK': 'chainlink',
    'UNI': 'uniswap'
  };

  private readonly cryptoNames: Record<string, string> = {
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'BNB': 'Binance Coin',
    'SOL': 'Solana',
    'ADA': 'Cardano',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap'
  };

  /**
   * Get crypto prices for specific symbols - REAL API, NO FALLBACK
   */
  async getCryptoPrices(symbols: string[]): Promise<CryptoPrice[]> {
    try {
      // Check cache first
      const cached = this.getCachedPrices();
      if (cached && cached.length > 0) {
        const filteredCache = cached.filter(crypto => symbols.includes(crypto.symbol));
        if (filteredCache.length === symbols.length) {
          console.log('✅ Using cached crypto prices');
          return filteredCache;
        }
      }

      // Get CoinGecko IDs for requested symbols
      const coinIds = symbols
        .map(symbol => this.cryptoIds[symbol])
        .filter(Boolean);

      if (coinIds.length === 0) {
        console.warn('No valid crypto symbols found');
        return [];
      }

      // Call CoinGecko API
      const ids = coinIds.join(',');
      const url = `${this.baseUrl}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_market_cap=true&include_last_updated_at=true`;

      console.log('Fetching crypto prices from CoinGecko...');
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        console.error('CoinGecko API error:', response.status, response.statusText);
        return [];
      }

      const data = await response.json();
      
      // Process response
      const results: CryptoPrice[] = [];
      
      Object.entries(this.cryptoIds).forEach(([symbol, coinId]) => {
        if (symbols.includes(symbol) && data[coinId]) {
          const coinData = data[coinId];
          
          results.push({
            symbol,
            name: this.cryptoNames[symbol] || symbol,
            price: Number((coinData.usd || 0).toFixed(2)),
            change: Number((coinData.usd_24h_change || 0).toFixed(2)),
            changePercent: Number((coinData.usd_24h_change || 0).toFixed(2)),
            marketCap: coinData.usd_market_cap || 0,
            lastUpdated: new Date()
          });
        }
      });

      // Cache results
      if (results.length > 0) {
        this.updateCache(results);
        console.log(`✅ Fetched ${results.length} crypto prices from CoinGecko`);
      }

      return results;

    } catch (error) {
      console.error('Crypto price service error:', error);
      return []; // NO FALLBACK
    }
  }

  /**
   * Get all supported crypto prices
   */
  async getAllCryptoPrices(): Promise<CryptoPrice[]> {
    const allSymbols = Object.keys(this.cryptoIds);
    return this.getCryptoPrices(allSymbols);
  }

  /**
   * Convert USD price to VND
   */
  convertToVND(usdPrice: number, usdToVndRate: number = 23000): number {
    return Number((usdPrice * usdToVndRate).toFixed(2));
  }

  /**
   * Calculate crypto portfolio value
   */
  calculatePortfolioValue(
    holdings: { symbol: string; quantity: number }[],
    prices: CryptoPrice[],
    usdToVndRate: number = 23000
  ): { totalUSD: number; totalVND: number; breakdown: any[] } {
    let totalUSD = 0;
    const breakdown: any[] = [];

    holdings.forEach(holding => {
      const price = prices.find(p => p.symbol === holding.symbol);
      if (price) {
        const valueUSD = price.price * holding.quantity;
        const valueVND = this.convertToVND(valueUSD, usdToVndRate);
        
        totalUSD += valueUSD;
        
        breakdown.push({
          symbol: holding.symbol,
          name: price.name,
          quantity: holding.quantity,
          unitPriceUSD: price.price,
          unitPriceVND: this.convertToVND(price.price, usdToVndRate),
          totalValueUSD: Number(valueUSD.toFixed(2)),
          totalValueVND: Number(valueVND.toFixed(2)),
          change24h: price.changePercent
        });
      }
    });

    return {
      totalUSD: Number(totalUSD.toFixed(2)),
      totalVND: Number(this.convertToVND(totalUSD, usdToVndRate).toFixed(2)),
      breakdown
    };
  }

  /**
   * Cache management
   */
  private updateCache(prices: CryptoPrice[]): void {
    const expiry = Date.now() + (30 * 60 * 1000); // 30 minutes
    this.cache.set('crypto_prices', { data: prices, expiry });
  }

  private getCachedPrices(): CryptoPrice[] | null {
    const cached = this.cache.get('crypto_prices');
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  /**
   * Get supported crypto symbols
   */
  getSupportedSymbols(): string[] {
    return Object.keys(this.cryptoIds);
  }

  /**
   * Check if symbol is supported
   */
  isSymbolSupported(symbol: string): boolean {
    return symbol in this.cryptoIds;
  }

  /**
   * Get crypto name by symbol
   */
  getCryptoName(symbol: string): string {
    return this.cryptoNames[symbol] || symbol;
  }
}

export default new CryptoPriceService();
