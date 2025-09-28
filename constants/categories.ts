/**
 * Category interfaces for Firebase data structure
 * Categories will be stored and managed in Firebase Firestore
 */

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: 'expense' | 'income';
  subcategories: string[];
  budgetSuggestion?: number; // VNĐ - gợi ý ngân sách tháng
  description: string;
  keywords: string[]; // Từ khóa để auto-categorize
  ownerId: string; // User who created this category
  isDefault?: boolean; // System default categories
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryGroup {
  id: string;
  name: string;
  categories: Category[];
  order: number;
} 
