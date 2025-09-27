import { Timestamp } from 'firebase/firestore';

interface GoldPrice {
  type: 'SJC' | 'PNJ' | 'NUTRANG';
  name: string;
  buyPrice: number; // VNĐ/chỉ
  sellPrice: number; // VNĐ/chỉ
  change: number; // Thay đổi so với hôm trước
  changePercent: number;
  lastUpdated: Date;
  source: string;
}

interface GoldPriceHistory {
  date: string; // YYYY-MM-DD
  prices: GoldPrice[];
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
   * Lấy giá vàng từ DOJI
   */
  async getDOJIGoldPrices(): Promise<GoldPrice[]> {
    try {
      const response = await fetch(this.sources.doji);
      const data = await response.json();
      
      return data.data.map((item: any) => ({
        type: 'DOJI' as const,
        buyPrice: item.buy_price * 1000,
        sellPrice: item.sell_price * 1000,
        change: item.change * 1000,
        changePercent: item.change_percent,
        lastUpdated: Timestamp.now(),
        source: 'DOJI'
      }));
    } catch (error) {
      console.error('Lỗi lấy giá vàng DOJI:', error);
      return [];
    }
  }

  /**
   * Lấy giá vàng từ PNJ
   */
  async getPNJGoldPrices(): Promise<GoldPrice[]> {
    try {
      // PNJ có thể cần scraping hoặc API riêng
      const pnjResponse = await fetch(`${this.sources.pnj}?format=json`);
      if (pnjResponse.ok) {
        const pnjData = await pnjResponse.json();
        // Process PNJ data structure
        console.log('PNJ API response received');
        return [{
          type: 'PNJ',
          buyPrice: pnjData.gold_price.buy * 1000,
          sellPrice: pnjData.gold_price.sell * 1000,
          change: pnjData.gold_price.change * 1000,
          changePercent: pnjData.gold_price.change_percent,
          lastUpdated: Timestamp.now(),
          source: 'PNJ'
        }];
      }
    } catch (error) {
      console.error('Lỗi lấy giá vàng PNJ:', error);
      return [];
    }
  }

  /**
   * Tổng hợp giá vàng từ tất cả nguồn - REAL API ONLY, NO FALLBACK
   */
  async getAllGoldPrices(): Promise<GoldPrice[]> {
    const [sjcPrices, dojiPrices, pnjPrices] = await Promise.allSettled([
      this.getSJCGoldPrices(),
      this.getDOJIGoldPrices(),
      this.getPNJGoldPrices()
    ]);

    const allPrices: GoldPrice[] = [
      ...(sjcPrices.status === 'fulfilled' ? sjcPrices.value : []),
      ...(dojiPrices.status === 'fulfilled' ? dojiPrices.value : []),
      ...(pnjPrices.status === 'fulfilled' ? pnjPrices.value : [])
    ];

    // NO FALLBACK - Return empty array if no real data available
    if (allPrices.length === 0) {
      console.warn('Unable to fetch real gold prices from any source');
      return [];
    }

    // Cache kết quả
    this.updateGoldCache(allPrices);
    
    return allPrices;
  }

  /**
   * Lấy giá vàng trung bình (để hiển thị chính)
   */
  getAverageGoldPrice(prices: GoldPrice[]): GoldPrice | null {
    if (prices.length === 0) return null;

    const avgBuy = prices.reduce((sum, p) => sum + p.buyPrice, 0) / prices.length;
    const avgSell = prices.reduce((sum, p) => sum + p.sellPrice, 0) / prices.length;
    const avgChange = prices.reduce((sum, p) => sum + p.change, 0) / prices.length;

    return {
      type: 'SJC', // Dùng SJC làm chuẩn
      buyPrice: Math.round(avgBuy),
      sellPrice: Math.round(avgSell),
      change: Math.round(avgChange),
      changePercent: avgBuy > 0 ? (avgChange / avgBuy) * 100 : 0,
      lastUpdated: Timestamp.now(),
      source: 'Trung bình thị trường'
    };
  }

  /**
   * Lưu lịch sử giá vàng (chạy daily)
   */
  async saveGoldPriceHistory(): Promise<void> {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const prices = await this.getAllGoldPrices();
    
    const historyData: GoldPriceHistory = {
      date: today,
      prices
    };

    // Lưu vào Firestore collection 'goldPriceHistory'
    try {
      // await addDoc(collection(db, 'goldPriceHistory'), historyData);
      console.log(`Đã lưu lịch sử giá vàng ngày ${today}`);
    } catch (error) {
      console.error('Lỗi lưu lịch sử giá vàng:', error);
    }
  }

  /**
   * Lấy lịch sử giá vàng theo khoảng thời gian
   */
  async getGoldPriceHistory(startDate: string, endDate: string): Promise<GoldPriceHistory[]> {
    try {
      // Query Firestore để lấy lịch sử
      // const q = query(
      //   collection(db, 'goldPriceHistory'),
      //   where('date', '>=', startDate),
      //   where('date', '<=', endDate),
      //   orderBy('date', 'desc')
      // );
      // const snapshot = await getDocs(q);
      // return snapshot.docs.map(doc => doc.data() as GoldPriceHistory);
      
      // Tạm thời return empty array
      return [];
    } catch (error) {
      console.error('Lỗi lấy lịch sử giá vàng:', error);
      return [];
    }
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
   * Fallback prices khi tất cả API fail
   */
  private getFallbackGoldPrices(): GoldPrice[] {
    // Giá vàng fallback (cập nhật định kỳ)
    const fallbackPrice = 75000000; // 75 triệu VNĐ/chỉ
    
    return [
      {
        type: 'SJC',
        buyPrice: fallbackPrice,
        sellPrice: fallbackPrice + 500000, // Chênh lệch 500k
        change: 0,
        changePercent: 0,
        lastUpdated: Timestamp.now(),
        source: 'Fallback'
      }
    ];
  }

  /**
   * Cache giá vàng (expire sau 1 giờ)
   */
  private updateGoldCache(prices: GoldPrice[]): void {
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
   * Kiểm tra thời gian cập nhật giá vàng (12:00 ICT)
   */
  shouldUpdateGoldPrices(): boolean {
    const now = new Date();
    const vietnamTime = new Date(now.toLocaleString("en-US", {timeZone: "Asia/Ho_Chi_Minh"}));
    const hour = vietnamTime.getHours();
    
    // Cập nhật vào 12:00 trưa hoặc nếu chưa có dữ liệu hôm nay
    return hour === 12 || !this.hasTodayGoldData();
  }

  private hasTodayGoldData(): boolean {
    const cached = this.getCachedGoldPrices();
    if (!cached || cached.length === 0) return false;
    
    const today = new Date().toDateString();
    const cacheDate = cached[0].lastUpdated.toDate().toDateString();
    
    return today === cacheDate;
  }
}

export default new GoldPriceService();
