import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';
import { logger } from 'firebase-functions';

// Initialize Firebase Admin
initializeApp();

interface CurrencyRateData {
  rate: number;
  lastUpdated: number;
  source: string;
  ttl: Timestamp;
}

interface CoinGeckoResponse {
  [coinId: string]: {
    vnd?: number;
  };
}

// Scheduled function to update currency rates every hour
export const updateCurrencyRates = onSchedule('every 1 hours', async () => {
  const db = getFirestore();
  
  try {
    logger.info('Starting currency rates update...');
    
    // Fetch rates from CoinGecko API
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd,eur,japanese-yen&vs_currencies=vnd',
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'HuChiTieu-CloudFunction/1.0'
        },
        signal: AbortSignal.timeout(15000) // 15 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status} ${response.statusText}`);
    }
    
    const data: CoinGeckoResponse = await response.json();
    logger.info('CoinGecko response:', data);
    
    // Prepare batch write
    const batch = db.batch();
    const now = Timestamp.now();
    const ttl = Timestamp.fromMillis(Date.now() + 3600000); // 1 hour TTL
    
    // Transform and store rates
    const rates: Record<string, number> = {
      USD: data.usd?.vnd || 24000, // Fallback rates
      EUR: data.eur?.vnd || 26000,
      JPY: data['japanese-yen']?.vnd || 160
    };
    
    // Add VND as base currency
    rates.VND = 1;
    
    Object.entries(rates).forEach(([currency, rate]) => {
      const docRef = db.collection('rates').doc(currency);
      const rateData: CurrencyRateData = {
        rate,
        lastUpdated: now.toMillis(),
        source: 'coingecko_scheduled',
        ttl
      };
      batch.set(docRef, rateData);
    });
    
    await batch.commit();
    
    logger.info('Currency rates updated successfully:', rates);
    
    // Log to audit collection for monitoring
    await db.collection('audit').add({
      action: 'currency_rates_updated',
      timestamp: now,
      data: rates,
      source: 'cloud_function'
    });
    
  } catch (error) {
    logger.error('Failed to update currency rates:', error);
    
    // Log error to audit collection
    await db.collection('audit').add({
      action: 'currency_rates_update_failed',
      timestamp: Timestamp.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
      source: 'cloud_function'
    });
    
    // Don't throw - we don't want the function to fail completely
    // The client will fall back to cached rates
  }
});

// Manual currency rate update function (callable)
export const manualUpdateRates = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const db = getFirestore();
  
  try {
    logger.info(`Manual rate update requested by user: ${request.auth.uid}`);
    
    // Same logic as scheduled function
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=usd,eur,japanese-yen&vs_currencies=vnd',
      { 
        headers: { 
          'Accept': 'application/json',
          'User-Agent': 'HuChiTieu-CloudFunction/1.0'
        },
        signal: AbortSignal.timeout(10000)
      }
    );
    
    if (!response.ok) {
      throw new HttpsError('unavailable', `API error: ${response.status}`);
    }
    
    const data: CoinGeckoResponse = await response.json();
    
    const batch = db.batch();
    const now = Timestamp.now();
    const ttl = Timestamp.fromMillis(Date.now() + 3600000);
    
    const rates: Record<string, number> = {
      VND: 1,
      USD: data.usd?.vnd || 24000,
      EUR: data.eur?.vnd || 26000,
      JPY: data['japanese-yen']?.vnd || 160
    };
    
    Object.entries(rates).forEach(([currency, rate]) => {
      const docRef = db.collection('rates').doc(currency);
      const rateData: CurrencyRateData = {
        rate,
        lastUpdated: now.toMillis(),
        source: 'manual_update',
        ttl
      };
      batch.set(docRef, rateData);
    });
    
    await batch.commit();
    
    // Log audit
    await db.collection('audit').add({
      action: 'manual_currency_update',
      userId: request.auth.uid,
      timestamp: now,
      data: rates,
      source: 'cloud_function'
    });
    
    logger.info('Manual currency rates updated successfully');
    
    return { 
      success: true, 
      rates,
      timestamp: now.toMillis()
    };
    
  } catch (error) {
    logger.error('Manual rate update failed:', error);
    
    if (error instanceof HttpsError) {
      throw error;
    }
    
    throw new HttpsError('internal', 'Failed to update rates');
  }
});

// Function to set manual rate override
export const setManualRate = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { currency, rate } = request.data;
  
  if (!currency || typeof rate !== 'number' || rate <= 0) {
    throw new HttpsError('invalid-argument', 'Invalid currency or rate');
  }
  
  const supportedCurrencies = ['USD', 'EUR', 'JPY'];
  if (!supportedCurrencies.includes(currency)) {
    throw new HttpsError('invalid-argument', 'Unsupported currency');
  }
  
  const db = getFirestore();
  
  try {
    const now = Timestamp.now();
    const rateData: CurrencyRateData = {
      rate,
      lastUpdated: now.toMillis(),
      source: 'manual_override',
      ttl: Timestamp.fromMillis(Date.now() + 86400000) // 24 hours for manual overrides
    };
    
    await db.collection('rates').doc(currency).set(rateData);
    
    // Log audit
    await db.collection('audit').add({
      action: 'manual_rate_override',
      userId: request.auth.uid,
      currency,
      rate,
      timestamp: now,
      source: 'cloud_function'
    });
    
    logger.info(`Manual rate override set: ${currency} = ${rate} VND by user ${request.auth.uid}`);
    
    return { 
      success: true,
      currency,
      rate,
      timestamp: now.toMillis()
    };
    
  } catch (error) {
    logger.error('Failed to set manual rate:', error);
    throw new HttpsError('internal', 'Failed to set manual rate');
  }
});

// Health check function
export const healthCheck = onCall(async () => {
  const db = getFirestore();
  
  try {
    // Check if we can read from Firestore
    const testDoc = await db.collection('rates').doc('USD').get();
    
    return {
      status: 'healthy',
      timestamp: Timestamp.now().toMillis(),
      firestore: 'connected',
      ratesAvailable: testDoc.exists
    };
  } catch (error) {
    logger.error('Health check failed:', error);
    throw new HttpsError('internal', 'Service unhealthy');
  }
});
