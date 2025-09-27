import { Timestamp } from 'firebase/firestore';

/**
 * Convert various date formats to a consistent Date object
 */
export const toDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;
  
  if (typeof dateValue === 'string') {
    return new Date(dateValue);
  }
  
  if (dateValue instanceof Date) {
    return dateValue;
  }
  
  if (dateValue && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }
  
  return null;
};

/**
 * Format date for display in Vietnamese locale
 */
export const formatDate = (dateValue: any): string => {
  const date = toDate(dateValue);
  if (!date) return 'N/A';
  
  return date.toLocaleDateString('vi-VN');
};

/**
 * Format date and time for display in Vietnamese locale
 */
export const formatDateTime = (dateValue: any): string => {
  const date = toDate(dateValue);
  if (!date) return 'N/A';
  
  return date.toLocaleString('vi-VN');
};

/**
 * Convert Firestore Timestamp to ISO string for Redux serialization
 */
export const timestampToISOString = (timestamp: any): string => {
  if (!timestamp) return '';
  
  if (typeof timestamp === 'string') {
    return timestamp;
  }
  
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }
  
  return '';
};
