import { MarketData, Asset, PortfolioSummary, isMarketAsset, getAssetSymbol, getAssetValue } from '../types';

interface CoinGeckoResponse {
  [coinId: string]: {
    vnd: number;
    vnd_24h_change: number;
    vnd_market_cap?: number;
    vnd_24h_vol?: number;
    last_updated_at: number;
  };
}

interface AlphaVantageResponse {
  'Global Quote': {
    '01. symbol': string;
    '02. open': string;
    '03. high': string;
    '04. low': string;
    '05. price': string;
    '06. volume': string;
    '07. latest trading day': string;
    '08. previous close': string;
    '09. change': string;
    '10. change percent': string;
  };
}

class MarketDataService {
  private static readonly COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';
  private static readonly ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';
  private static readonly ALPHA_VANTAGE_API_KEY = 'demo'; // Replace with real API key
  
  // Cache for market data
  private marketDataCache = new Map<string, MarketData>();
  private cacheExpiry = new Map<string, number>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get cryptocurrency market data from CoinGecko
   */
  async getCryptoData(symbols: string[]): Promise<MarketData[]> {
    try {
      // Map common symbols to CoinGecko IDs
      const symbolToId: Record<string, string> = {
        'BTC': 'bitcoin',
        'ETH': 'ethereum',
        'BNB': 'binancecoin',
        'SOL': 'solana',
      };

      const coinIds = symbols.map(symbol => symbolToId[symbol.toUpperCase()] || symbol.toLowerCase());
      const idsParam = coinIds.join(',');

      const response = await fetch(
        `${MarketDataService.COINGECKO_BASE_URL}/simple/price?ids=${idsParam}&vs_currencies=vnd&include_24hr_change=true&include_market_cap=true&include_24hr_vol=true&include_last_updated_at=true`,
        {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'HuChiTieu-App/1.0'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data: CoinGeckoResponse = await response.json();
      
      return Object.entries(data).map(([coinId, priceData]) => {
        const symbol = Object.keys(symbolToId).find(key => symbolToId[key] === coinId) || coinId.toUpperCase();
        
        const marketData: MarketData = {
          symbol: symbol,
          name: this.getCryptoName(symbol),
          currentPrice: priceData.vnd,
          priceChange24h: (priceData.vnd_24h_change / 100) * priceData.vnd,
          priceChangePercent24h: priceData.vnd_24h_change,
          marketCap: priceData.vnd_market_cap,
          volume24h: priceData.vnd_24h_vol,
          lastUpdated: priceData.last_updated_at * 1000,
          logoUrl: `https://assets.coingecko.com/coins/images/${this.getCoinGeckoImageId(symbol)}/small/${symbol.toLowerCase()}.png`,
          type: 'crypto'
        };

        // Cache the data
        this.marketDataCache.set(symbol, marketData);
        this.cacheExpiry.set(symbol, Date.now() + this.CACHE_DURATION);

        return marketData;
      });

    } catch (error) {
      console.error('Failed to fetch crypto data:', error);
      
      // Return cached data if available
      const cachedData = symbols.map(symbol => this.marketDataCache.get(symbol.toUpperCase()))
        .filter(Boolean) as MarketData[];
      
      if (cachedData.length > 0) {
        console.log('Using cached crypto data');
        return cachedData;
      }

      // Return empty array instead of fallback data
      return [];
    }
  }

  /**
   * Get stock market data from Alpha Vantage (or fallback)
   */
  async getStockData(symbols: string[]): Promise<MarketData[]> {
    const results: MarketData[] = [];

    for (const symbol of symbols) {
      try {
        // Check cache first
        const cached = this.marketDataCache.get(symbol);
        const cacheExpiry = this.cacheExpiry.get(symbol);
        
        if (cached && cacheExpiry && Date.now() < cacheExpiry) {
          results.push(cached);
          continue;
        }

        // Skip if no real API available - don't use fallback data
        console.log(`No real stock API available for ${symbol}, skipping...`);

      } catch (error) {
        console.error(`Failed to fetch stock data for ${symbol}:`, error);
        // Don't add fallback data, just skip
      }
    }

    return results;
  }

  /**
   * Get market data for multiple assets
   */
  async getMarketData(assets: Asset[]): Promise<MarketData[]> {
    const cryptoSymbols = assets
      .filter(asset => isMarketAsset(asset) && asset.type === 'crypto' && asset.symbol)
      .map(asset => getAssetSymbol(asset)!)
      .filter(Boolean);

    const stockSymbols = assets
      .filter(asset => isMarketAsset(asset) && asset.type === 'stock' && asset.symbol)
      .map(asset => getAssetSymbol(asset)!)
      .filter(Boolean);

    const [cryptoData, stockData] = await Promise.all([
      cryptoSymbols.length > 0 ? this.getCryptoData(cryptoSymbols) : Promise.resolve([]),
      stockSymbols.length > 0 ? this.getStockData(stockSymbols) : Promise.resolve([])
    ]);

    return [...cryptoData, ...stockData];
  }

  /**
   * Calculate portfolio summary
   */
  calculatePortfolioSummary(assets: Asset[], marketData: MarketData[]): PortfolioSummary {
    const marketDataMap = new Map(marketData.map(data => [data.symbol, data]));
    
    let totalValue = 0;
    let totalCost = 0;
    let dayChange = 0;
    const assetAllocation: Record<string, { value: number; percentage: number }> = {};

    assets.forEach(asset => {
      let assetValue = getAssetValue(asset);
      let assetCost = assetValue;
      let assetDayChange = 0;

      if (isMarketAsset(asset)) {
        const symbol = getAssetSymbol(asset);
        if (symbol) {
          const market = marketDataMap.get(symbol);
          if (market) {
            assetValue = asset.quantity * market.currentPrice;
            assetCost = asset.quantity * asset.purchasePrice;
            assetDayChange = asset.quantity * market.priceChange24h;
          } else {
            // No market data available, use purchase price * quantity
            assetValue = asset.quantity * asset.purchasePrice;
            assetCost = assetValue;
          }
        }
      }

      totalValue += assetValue;
      totalCost += assetCost;
      dayChange += assetDayChange;

      // Asset allocation
      const assetType = asset.type;
      if (!assetAllocation[assetType]) {
        assetAllocation[assetType] = { value: 0, percentage: 0 };
      }
      assetAllocation[assetType].value += assetValue;
    });

    // Calculate percentages
    Object.keys(assetAllocation).forEach(type => {
      assetAllocation[type].percentage = totalValue > 0 ? (assetAllocation[type].value / totalValue) * 100 : 0;
    });

    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;
    const dayChangePercent = totalValue > 0 ? (dayChange / (totalValue - dayChange)) * 100 : 0;

    return {
      totalValue,
      totalGainLoss,
      totalGainLossPercent,
      dayChange,
      dayChangePercent,
      assetAllocation
    };
  }

  /**
   * Update asset with current market data
   */
  updateAssetWithMarketData(asset: Asset, marketData: MarketData): Asset {
    if (!isMarketAsset(asset)) {
      return asset;
    }

    const symbol = getAssetSymbol(asset);
    if (!symbol || symbol !== marketData.symbol) {
      return asset;
    }

    const currentPrice = marketData.currentPrice;
    const marketValue = asset.quantity * currentPrice;
    const purchaseValue = asset.quantity * asset.purchasePrice;
    const gainLoss = marketValue - purchaseValue;
    const gainLossPercent = purchaseValue > 0 ? (gainLoss / purchaseValue) * 100 : 0;

    return {
      ...asset,
      currentPrice,
      marketValue,
      gainLoss,
      gainLossPercent,
      lastUpdated: new Date(marketData.lastUpdated) as any
    };
  }

  // Helper methods
  private getCryptoName(symbol: string): string {
    const names: Record<string, string> = {
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'ADA': 'Cardano',
      'SOL': 'Solana',
      'DOT': 'Polkadot',
      'MATIC': 'Polygon',
      'AVAX': 'Avalanche',
      'LINK': 'Chainlink',
      'UNI': 'Uniswap'
    };
    return names[symbol.toUpperCase()] || symbol;
  }

  private getCoinGeckoImageId(symbol: string): string {
    const imageIds: Record<string, string> = {
      'BTC': '1',
      'ETH': '279',
      'BNB': '825',
      'ADA': '975',
      'SOL': '4128',
      'DOT': '12171',
      'MATIC': '4713',
      'AVAX': '12559',
      'LINK': '1',
      'UNI': '12504'
    };
    return imageIds[symbol.toUpperCase()] || '1';
  }

}

export default new MarketDataService();
