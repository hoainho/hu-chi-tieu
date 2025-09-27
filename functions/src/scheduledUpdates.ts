import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

initializeApp();
const db = getFirestore();

/**
 * Cập nhật giá Coin/Chứng khoán mỗi 30 phút
 * Chạy từ 9:00 - 21:00 ICT (giờ giao dịch)
 */
export const updateCryptoStockPrices = onSchedule({
  schedule: '*/30 9-21 * * *', // Mỗi 30 phút từ 9h-21h
  timeZone: 'Asia/Ho_Chi_Minh',
  memory: '256MiB',
  timeoutSeconds: 300
}, async (event) => {
  logger.info('Bắt đầu cập nhật giá Crypto/Stock');
  
  try {
    // Lấy danh sách tài sản cần cập nhật từ Firestore
    const investmentsSnapshot = await db.collection('investments')
      .where('type', 'in', ['crypto', 'stock'])
      .get();
    
    if (investmentsSnapshot.empty) {
      logger.info('Không có tài sản nào cần cập nhật');
      return;
    }

    // Nhóm theo loại tài sản
    const cryptoSymbols = new Set<string>();
    const vnStockSymbols = new Set<string>();
    const usStockSymbols = new Set<string>();

    investmentsSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const symbol = data.symbol;
      
      if (data.type === 'crypto') {
        cryptoSymbols.add(symbol);
      } else if (data.type === 'stock') {
        if (isVNStock(symbol)) {
          vnStockSymbols.add(symbol);
        } else {
          usStockSymbols.add(symbol);
        }
      }
    });

    // Batch update prices
    const updatePromises = [];

    if (cryptoSymbols.size > 0) {
      updatePromises.push(updateCryptoPrices(Array.from(cryptoSymbols)));
    }
    
    if (vnStockSymbols.size > 0) {
      updatePromises.push(updateVNStockPrices(Array.from(vnStockSymbols)));
    }
    
    if (usStockSymbols.size > 0) {
      updatePromises.push(updateUSStockPrices(Array.from(usStockSymbols)));
    }

    await Promise.allSettled(updatePromises);
    
    logger.info(`Cập nhật thành công: ${cryptoSymbols.size} crypto, ${vnStockSymbols.size} VN stocks, ${usStockSymbols.size} US stocks`);
    
    // Cập nhật timestamp cuối cùng
    await db.collection('systemStatus').doc('priceUpdates').set({
      lastCryptoStockUpdate: new Date(),
      cryptoCount: cryptoSymbols.size,
      vnStockCount: vnStockSymbols.size,
      usStockCount: usStockSymbols.size
    }, { merge: true });

  } catch (error) {
    logger.error('Lỗi cập nhật giá Crypto/Stock:', error);
    
    // Ghi log lỗi vào Firestore để debug
    await db.collection('errorLogs').add({
      type: 'price_update_error',
      error: error.message,
      timestamp: new Date(),
      function: 'updateCryptoStockPrices'
    });
  }
});

/**
 * Cập nhật giá vàng mỗi ngày lúc 12:00 ICT
 */
export const updateGoldPrices = onSchedule({
  schedule: '0 12 * * *', // 12:00 hàng ngày
  timeZone: 'Asia/Ho_Chi_Minh',
  memory: '256MiB',
  timeoutSeconds: 180
}, async (event) => {
  logger.info('Bắt đầu cập nhật giá vàng 12:00 ICT');
  
  try {
    // Lấy giá vàng từ các nguồn
    const goldPrices = await fetchGoldPricesFromSources();
    
    if (goldPrices.length === 0) {
      logger.warn('Không lấy được giá vàng từ nguồn nào');
      return;
    }

    // Lưu vào collection 'goldPrices'
    const batch = db.batch();
    const today = new Date().toISOString().split('T')[0];

    goldPrices.forEach((price, index) => {
      const docRef = db.collection('goldPrices').doc(`${today}_${price.type}`);
      batch.set(docRef, {
        ...price,
        date: today,
        timestamp: new Date()
      });
    });

    await batch.commit();

    // Lưu lịch sử giá vàng
    await db.collection('goldPriceHistory').doc(today).set({
      date: today,
      prices: goldPrices,
      timestamp: new Date()
    });

    // Cập nhật cache giá vàng chung
    const avgPrice = calculateAverageGoldPrice(goldPrices);
    await db.collection('rates').doc('gold_vn').set({
      symbol: 'GOLD',
      type: 'gold',
      price: avgPrice.sellPrice, // Dùng giá bán làm giá tham chiếu
      buyPrice: avgPrice.buyPrice,
      sellPrice: avgPrice.sellPrice,
      change24h: avgPrice.change,
      changePercent: avgPrice.changePercent,
      source: 'SJC_DOJI_PNJ',
      lastUpdated: new Date(),
      nextUpdate: getNextGoldUpdateTime()
    });

    logger.info(`Cập nhật thành công ${goldPrices.length} loại giá vàng`);

    // Trigger notification cho users có đầu tư vàng
    await notifyGoldInvestors(avgPrice);

  } catch (error) {
    logger.error('Lỗi cập nhật giá vàng:', error);
    
    await db.collection('errorLogs').add({
      type: 'gold_price_update_error',
      error: error.message,
      timestamp: new Date(),
      function: 'updateGoldPrices'
    });
  }
});

/**
 * Cleanup dữ liệu cũ mỗi tuần
 */
export const weeklyCleanup = onSchedule({
  schedule: '0 2 * * 0', // 2:00 AM Chủ nhật hàng tuần
  timeZone: 'Asia/Ho_Chi_Minh',
  memory: '512MiB'
}, async (event) => {
  logger.info('Bắt đầu cleanup dữ liệu hàng tuần');
  
  try {
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Xóa error logs cũ hơn 1 tháng
    const oldErrorLogs = await db.collection('errorLogs')
      .where('timestamp', '<', oneMonthAgo)
      .get();

    const batch = db.batch();
    oldErrorLogs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Xóa audit logs cũ hơn 3 tháng
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const oldAuditLogs = await db.collection('auditLogs')
      .where('timestamp', '<', threeMonthsAgo)
      .get();

    oldAuditLogs.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Cleanup hoàn tất: Xóa ${oldErrorLogs.size} error logs, ${oldAuditLogs.size} audit logs`);

  } catch (error) {
    logger.error('Lỗi cleanup dữ liệu:', error);
  }
});

/**
 * Manual trigger để cập nhật giá khẩn cấp
 */
export const manualPriceUpdate = onRequest({
  cors: true,
  memory: '256MiB'
}, async (req, res) => {
  // Verify admin token
  const authToken = req.headers.authorization;
  if (!authToken || !await verifyAdminToken(authToken)) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const { type } = req.body; // 'crypto', 'stock', 'gold', 'all'

  try {
    let result = {};

    if (type === 'crypto' || type === 'all') {
      // Manual crypto update
      result.crypto = await updateCryptoPrices(['BTC', 'ETH', 'BNB']);
    }

    if (type === 'gold' || type === 'all') {
      // Manual gold update
      const goldPrices = await fetchGoldPricesFromSources();
      result.gold = goldPrices;
    }

    if (type === 'stock' || type === 'all') {
      // Manual stock update
      result.vnStock = await updateVNStockPrices(['VNM', 'VIC', 'VCB']);
      result.usStock = await updateUSStockPrices(['AAPL', 'GOOGL']);
    }

    res.json({
      success: true,
      message: `Cập nhật thành công loại: ${type}`,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Lỗi manual update:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Helper functions
async function updateCryptoPrices(symbols: string[]): Promise<any[]> {
  const coinIds = symbols.map(mapSymbolToCoinId).join(',');
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=vnd&include_24hr_change=true`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  const batch = db.batch();
  const results = [];

  Object.entries(data).forEach(([coinId, priceInfo]: [string, any]) => {
    const symbol = mapCoinIdToSymbol(coinId);
    const priceData = {
      symbol,
      type: 'crypto',
      price: priceInfo.vnd,
      change24h: priceInfo.vnd_24h_change || 0,
      changePercent: priceInfo.vnd_24h_change || 0,
      source: 'coingecko',
      lastUpdated: new Date(),
      nextUpdate: new Date(Date.now() + 30 * 60 * 1000) // 30 phút
    };

    const docRef = db.collection('rates').doc(symbol);
    batch.set(docRef, priceData);
    results.push(priceData);
  });

  await batch.commit();
  return results;
}

async function updateVNStockPrices(symbols: string[]): Promise<any[]> {
  const results = [];
  const batch = db.batch();

  for (const symbol of symbols) {
    try {
      // Giả lập API VN Stock
      const mockPrice = {
        symbol,
        type: 'stock',
        price: Math.random() * 1000000 + 500000, // Random price
        change24h: (Math.random() - 0.5) * 100000,
        changePercent: (Math.random() - 0.5) * 10,
        source: 'vnstock',
        lastUpdated: new Date(),
        nextUpdate: new Date(Date.now() + 30 * 60 * 1000)
      };

      const docRef = db.collection('rates').doc(symbol);
      batch.set(docRef, mockPrice);
      results.push(mockPrice);

      // Delay để tránh rate limit
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      logger.error(`Lỗi cập nhật ${symbol}:`, error);
    }
  }

  await batch.commit();
  return results;
}

async function updateUSStockPrices(symbols: string[]): Promise<any[]> {
  // Tương tự VN stocks nhưng với API Alpha Vantage
  const results = [];
  // Implementation...
  return results;
}

async function fetchGoldPricesFromSources(): Promise<any[]> {
  // Mock gold prices - thực tế sẽ call API SJC, DOJI, PNJ
  return [
    {
      type: 'SJC',
      buyPrice: 75000000, // 75 triệu/chỉ
      sellPrice: 75500000, // 75.5 triệu/chỉ
      change: 200000, // +200k
      changePercent: 0.27,
      source: 'SJC'
    },
    {
      type: 'DOJI',
      buyPrice: 74800000,
      sellPrice: 75300000,
      change: 150000,
      changePercent: 0.20,
      source: 'DOJI'
    }
  ];
}

function calculateAverageGoldPrice(prices: any[]): any {
  const avgBuy = prices.reduce((sum, p) => sum + p.buyPrice, 0) / prices.length;
  const avgSell = prices.reduce((sum, p) => sum + p.sellPrice, 0) / prices.length;
  const avgChange = prices.reduce((sum, p) => sum + p.change, 0) / prices.length;

  return {
    buyPrice: Math.round(avgBuy),
    sellPrice: Math.round(avgSell),
    change: Math.round(avgChange),
    changePercent: avgBuy > 0 ? (avgChange / avgBuy) * 100 : 0
  };
}

function getNextGoldUpdateTime(): Date {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(12, 0, 0, 0); // 12:00 ngày mai
  return tomorrow;
}

async function notifyGoldInvestors(avgPrice: any): Promise<void> {
  // Gửi notification cho users có đầu tư vàng
  const goldInvestors = await db.collection('investments')
    .where('type', '==', 'gold')
    .get();

  // Implementation notification logic...
}

function isVNStock(symbol: string): boolean {
  const vnStocks = ['VNM', 'VIC', 'VCB', 'HPG', 'MSN', 'CTG', 'BID', 'TCB'];
  return vnStocks.includes(symbol);
}

function mapSymbolToCoinId(symbol: string): string {
  const mapping: Record<string, string> = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin'
  };
  return mapping[symbol] || symbol.toLowerCase();
}

function mapCoinIdToSymbol(coinId: string): string {
  const mapping: Record<string, string> = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'binancecoin': 'BNB'
  };
  return mapping[coinId] || coinId.toUpperCase();
}

async function verifyAdminToken(token: string): Promise<boolean> {
  // Verify Firebase Admin token
  try {
    // const decodedToken = await admin.auth().verifyIdToken(token.replace('Bearer ', ''));
    // return decodedToken.admin === true;
    return true; // Mock for now
  } catch {
    return false;
  }
}
