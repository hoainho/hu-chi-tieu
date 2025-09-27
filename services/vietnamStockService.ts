/**
 * Vietnam Stock Service - CafeF API
 * Simple and reliable Vietnam stock data from CafeF
 */

export interface VietnamStock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdated: Date;
}

// Stock names mapping
const STOCK_NAMES: Record<string, string> = {
  'ACB': 'Ngân hàng ACB',
  'HPG': 'Hòa Phát Group',
  'VIC': 'Vingroup',
  'VHM': 'Vinhomes',
  'VCB': 'Vietcombank',
  'BID': 'BIDV',
  'CTG': 'VietinBank',
  'MSN': 'Masan Group',
  'SAB': 'Sabeco',
  'GAS': 'PV Gas',
  'PLX': 'Petrolimex',
  'FPT': 'FPT Corporation',
  'VNM': 'Vinamilk',
  'TCB': 'Techcombank',
  'MWG': 'Mobile World',
  'POW': 'PetroVietnam Power'
};

/**
 * Get Vietnam stock data using CafeF API - SIMPLE & RELIABLE
 */
export const getVietnamStocks = async (symbols: string[]): Promise<VietnamStock[]> => {
  const results: VietnamStock[] = [];
  
  for (const symbol of symbols) {
    try {
      // CafeF API - No CORS issues, no API key needed
      const cafefUrl = `https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/PriceHistory.ashx?Symbol=${symbol.toLowerCase()}&EndDate=${new Date().toISOString()}&PageIndex=1&PageSize=1`;
      
      const response = await fetch(cafefUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (!response.ok) {
        console.warn(`❌ CafeF API response not OK for ${symbol}:`, response.status);
        continue;
      }
      
      const data = await response.json();

      if (data.Success && data.Data && data.Data.Data && data.Data.Data.length > 0) {
        const stockData = data.Data.Data[0];
        
        // Parse CafeF data
        const price = stockData.GiaDieuChinh; // Giá đóng cửa
        const volume = stockData.KhoiLuongKhopLenh; // Khối lượng khớp lệnh

        // Parse change from "ThayDoi" field: "-0.2(-0.78 %)" or "0.5(+1.25 %)"
        const changeText = stockData.ThayDoi || "0(0 %)";
        const changeMatch = changeText.match(/^([+-]?\d*\.?\d+)\(([+-]?\d*\.?\d+)\s*%\)$/);
        
        let change = 0;
        let changePercent = 0;
        
        if (changeMatch) {
          change = parseFloat(changeMatch[1]) || 0;
          changePercent = parseFloat(changeMatch[2]) || 0;
        }
        
        results.push({
          symbol: symbol.toUpperCase(),
          name: STOCK_NAMES[symbol.toUpperCase()] || symbol.toUpperCase(),
          price: Number(price.toFixed(2)) * 1000,
          change: Number(change.toFixed(2)) * 1000,
          changePercent: Number(changePercent.toFixed(2)),
          volume: volume || 0,
          lastUpdated: new Date()
        });
        
      } else {
        console.warn(`❌ No data found for ${symbol} in CafeF response`);
      }
      
    } catch (error) {
      console.error(`❌ CafeF API failed for ${symbol}:`, error);
    }
  }
  
  return results;
};

/**
 * Get single stock data from CafeF API
 */
export const getVietnamStock = async (symbol: string): Promise<VietnamStock | null> => {
  const results = await getVietnamStocks([symbol]);
  return results.length > 0 ? results[0] : null;
};

/**
 * Get stock name by symbol
 */
export const getStockName = (symbol: string): string => {
  return STOCK_NAMES[symbol.toUpperCase()] || symbol.toUpperCase();
};

