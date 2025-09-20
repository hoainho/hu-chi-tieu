import { Timestamp } from "firebase/firestore";

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Timestamp;
  // Couple's Finance fields
  type: 'private' | 'shared';
  ownerId: string; // The user who created the transaction
  coupleId?: string;
  paidBy?: string; // The user who paid for the shared transaction
}

export interface IncomeSource {
  id: string;
  name: string;
  amount: number;
  date: Timestamp;
  // Couple's Finance fields
  type: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
}

export interface Category {
  id: string;
  name: string;
  ownerId: string; // User ID or Couple ID
}

export interface Asset {
  id:string;
  name: string;
  type: string;
  value: number;
  date: Timestamp;
  // Couple's Finance fields
  ownerType: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  coupleId?: string;
  partnerId?: string;
  partnerName?: string;
}

export const DefaultExpenseCategories = [
  'Tạp hóa',
  'Tiện ích',
  'Thuê nhà/Trả góp',
  'Đi lại',
  'Ăn ngoài',
  'Giải trí',
  'Sức khỏe',
  'Mua sắm',
  'Du lịch',
  'Khác',
];

export const AssetTypes = [
  'Tiền tiết kiệm',
  'Chứng khoán',
  'Tiền điện tử',
  'Vàng',
  'Bất động sản',
  'Khác',
];
