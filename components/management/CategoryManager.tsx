import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import { fetchTransactions } from '../../store/slices/transactionSlice';
import { Category, Transaction } from '../../types';
import { addCategory, updateCategory, deleteCategory } from '../../services/firestoreService';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { useMemo } from 'react';

interface CategoryManagerProps {
  categories: Category[];
  transactions: Transaction[];
  onDataChange: () => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, transactions, onDataChange }) => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector(state => state.user);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categoriesInUse = useMemo(() => {
    const inUse = new Set<string>();
    transactions.forEach(t => inUse.add(t.category));
    return inUse;
  }, [transactions]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newCategoryName.trim()) return;
    if (categories.some(c => c.name.toLowerCase() === newCategoryName.trim().toLowerCase())) {
        toast.error('Tên danh mục này đã tồn tại.');
        return;
    }

    setIsSubmitting(true);
    try {
      await addCategory({ name: newCategoryName.trim(), ownerId: profile.uid });
      toast.success('Thêm danh mục thành công!');
      setNewCategoryName('');
      onDataChange();
    } catch (error) {
      toast.error('Thêm danh mục thất bại.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleEditClick = (category: Category) => {
    setEditingCategoryId(category.id);
    setEditingCategoryName(category.name);
  };

  const handleUpdateSubmit = async (e: React.FormEvent, categoryId: string) => {
    e.preventDefault();
    if (!profile || !editingCategoryName.trim()) return;
    if (categories.some(c => c.id !== categoryId && c.name.toLowerCase() === editingCategoryName.trim().toLowerCase())) {
        toast.error('Tên danh mục này đã tồn tại.');
        return;
    }
    
    setIsSubmitting(true);
    try {
        await updateCategory(categoryId, editingCategoryName.trim());
        toast.success('Cập nhật danh mục thành công!');
        setEditingCategoryId(null);
        onDataChange();
    } catch (error) {
        toast.error('Cập nhật danh mục thất bại.');
        console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };


  const handleDelete = async (category: Category) => {
    if (!profile) return;
    if (categoriesInUse.has(category.name)) {
        toast.error('Không thể xóa danh mục đang được sử dụng.');
        return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa danh mục "${category.name}" không?`)) {
      try {
        await deleteCategory(category.id);
        toast.success('Đã xóa danh mục.');
        onDataChange();
      } catch (error) {
        toast.error('Xóa danh mục thất bại.');
        console.error(error);
      }
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1">
        <h2 className="text-lg font-semibold mb-4">Thêm danh mục mới</h2>
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Tên danh mục</label>
            <Input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Vd: Giáo dục"
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Đang thêm...' : 'Thêm danh mục'}
          </Button>
        </form>
      </Card>
      <Card className="lg:col-span-2">
        <h2 className="text-lg font-semibold mb-4">Danh sách danh mục</h2>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              {editingCategoryId === cat.id ? (
                <form onSubmit={(e) => handleUpdateSubmit(e, cat.id)} className="flex-grow flex items-center gap-2">
                  <Input 
                    type="text" 
                    value={editingCategoryName} 
                    onChange={(e) => setEditingCategoryName(e.target.value)}
                    className="flex-grow"
                    autoFocus
                  />
                  <Button type="submit" variant="primary" className="py-1 px-3" disabled={isSubmitting}>Lưu</Button>
                  <Button type="button" variant="secondary" className="py-1 px-3" onClick={() => setEditingCategoryId(null)}>Hủy</Button>
                </form>
              ) : (
                <>
                  <span className="text-slate-800 font-medium">{cat.name}</span>
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleEditClick(cat)} className="text-blue-600 hover:text-blue-800" aria-label={`Sửa ${cat.name}`}>
                      <i className="fas fa-pencil-alt"></i>
                    </button>
                    <button
                      onClick={() => handleDelete(cat)}
                      className={`text-red-600 ${categoriesInUse.has(cat.name) ? 'opacity-50 cursor-not-allowed' : 'hover:text-red-800'}`}
                      disabled={categoriesInUse.has(cat.name)}
                      aria-label={`Xóa ${cat.name}`}
                      title={categoriesInUse.has(cat.name) ? "Không thể xóa danh mục đang sử dụng" : "Xóa danh mục"}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && <p className="text-center text-slate-500 py-4">Không có danh mục nào.</p>}
        </div>
      </Card>
    </div>
  );
};

export default CategoryManager;
