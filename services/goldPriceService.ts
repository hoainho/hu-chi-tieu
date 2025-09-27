/**
 * Vietnam Gold Price Service - PNJ API
 * Simple and reliable Vietnam gold data from PNJ
 */

export interface GoldPrice {
  type: 'SJC' | 'PNJ' | 'NUTRANG';
  name: string;
  buyPrice: number; // VNĐ/chỉ
  sellPrice: number; // VNĐ/chỉ
  change: number; // Thay đổi so với hôm trước
  changePercent: number;
  lastUpdated: Date;
  source: string;
}

class GoldPriceService {
  private readonly pnjApiUrl = 'https://edge-api.pnj.io/ecom-frontend/v3/get-gold-price';
  private cache = new Map<string, { data: GoldPrice[]; expiry: number }>();

  /**
   * Lấy giá vàng từ PNJ API - SIMPLE & RELIABLE
   */
  async getAllGoldPrices(): Promise<GoldPrice[]> {
    try {
      console.log('🔍 Fetching gold prices from PNJ API...');
      
      const response = await fetch(this.pnjApiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.warn(`❌ PNJ API response not OK:`, response.status);
        return [];
      }
      
      const data = await response.json();
      const results: GoldPrice[] = [];
      
      if (data.locations && data.locations.length > 0) {
        // Lấy giá từ TPHCM (location đầu tiên)
        const tphcmLocation = data.locations[0];
        
        if (tphcmLocation.gold_type && tphcmLocation.gold_type.length > 0) {
          tphcmLocation.gold_type.forEach((goldType: any) => {
            const buyPrice = parseFloat(goldType.gia_mua.replace(/\./g, '')) * 1000; // Chuyển từ nghìn sang VNĐ
            const sellPrice = parseFloat(goldType.gia_ban.replace(/\./g, '')) * 1000;
            
            // Tính thay đổi (giả định 0 vì API không cung cấp)
            const change = 0;
            const changePercent = 0;
            
            let type: 'SJC' | 'PNJ' | 'NUTRANG' = 'PNJ';
            if (goldType.name === 'SJC') type = 'SJC';
            else if (goldType.name.includes('nữ trang') || goldType.name.includes('Nhẫn')) type = 'NUTRANG';
            
            results.push({
              type,
              name: goldType.name,
              buyPrice: Number(buyPrice.toFixed(2)),
              sellPrice: Number(sellPrice.toFixed(2)),
              change: Number(change.toFixed(2)),
              changePercent: Number(changePercent.toFixed(2)),
              lastUpdated: new Date(),
              source: 'PNJ'
            });
          });
        }
      }
      
      if (results.length > 0) {
        console.log(`✅ Success: Fetched ${results.length} gold prices from PNJ`);
        this.updateCache(results);
      } else {
        console.warn('❌ No gold price data found in PNJ response');
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ PNJ Gold API failed:', error);
      return []; // NO FALLBACK
    }
  }

  /**
   * Lấy giá vàng trung bình (để hiển thị chính)
   */
  getAverageGoldPrice(prices: GoldPrice[]): GoldPrice | null {
    if (prices.length === 0) return null;

    const sjcPrices = prices.filter(p => p.type === 'SJC');
    if (sjcPrices.length > 0) {
      return sjcPrices[0]; // Ưu tiên SJC
    }

    const pnjPrices = prices.filter(p => p.type === 'PNJ');
    if (pnjPrices.length > 0) {
      return pnjPrices[0]; // Sau đó PNJ
    }

    return prices[0]; // Hoặc bất kỳ loại nào
  }

  /**
   * Tính toán P&L cho đầu tư vàng
   */
  calculateGoldInvestmentPnL(
    quantity: number, // số chỉ
    purchasePrice: number, // VNĐ/chỉ khi mua
    currentPrice: number // VNĐ/chỉ hiện tại
  ): { pnl: number; pnlPercent: number; marketValue: number } {
    const marketValue = quantity * currentPrice;
    const totalCost = quantity * purchasePrice;
    const pnl = marketValue - totalCost;
    const pnlPercent = totalCost > 0 ? (pnl / totalCost) * 100 : 0;

    return {
      pnl: Math.round(pnl),
      pnlPercent: Math.round(pnlPercent * 100) / 100,
      marketValue: Math.round(marketValue)
    };
  }

  /**
   * Cache giá vàng (expire sau 1 giờ)
   */
  private updateCache(prices: GoldPrice[]): void {
    const expiry = Date.now() + (60 * 60 * 1000); // 1 giờ
    this.cache.set('gold_prices', { data: prices, expiry });
  }

  /**
   * Lấy giá vàng từ cache nếu còn valid
   */
  getCachedGoldPrices(): GoldPrice[] | null {
    const cached = this.cache.get('gold_prices');
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    return null;
  }

  /**
   * Format giá vàng theo chuẩn Việt Nam
   */
  formatGoldPrice(price: number): string {
    // Chuyển từ VNĐ sang triệu VNĐ
    const priceInMillions = price / 1000000;
    return `${priceInMillions.toLocaleString('vi-VN', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 2 
    })} triệu/chỉ`;
  }

  /**
   * Kiểm tra thời gian cập nhật giá vàng (8:00 ICT)
   */
  shouldUpdateGoldPrices(): boolean {
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    const hour = vietnamTime.getHours();
    
    // Cập nhật vào 8:00 sáng hoặc nếu chưa có dữ liệu hôm nay
    return hour === 8 || !this.hasTodayGoldData();
  }

  private hasTodayGoldData(): boolean {
    const cached = this.getCachedGoldPrices();
    if (!cached || cached.length === 0) return false;
    
    const today = new Date().toDateString();
    const cacheDate = cached[0].lastUpdated.toDateString();
    
    return today === cacheDate;
  }
}

export default new GoldPriceService();
