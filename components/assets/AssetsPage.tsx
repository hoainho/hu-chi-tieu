import React, { useState, useContext } from 'react';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Asset, AssetTypes } from '../../types';
import { addAsset, deleteAsset, updateAsset } from '../../services/firestoreService';
import { UserDataContext } from '../../context/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

const AssetsPage: React.FC = () => {
  const { assets, loading, error, refreshData, profile } = useContext(UserDataContext);
  
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [type, setType] = useState(AssetTypes[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name || !value) return;
    setIsSubmitting(true);
    
    const newAsset: Omit<Asset, 'id'> = {
      name,
      value: parseFloat(value),
      type,
      date: Timestamp.now(),
      ownerType: isShared && profile.coupleId ? 'shared' : 'private',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
    };

    try {
      await addAsset(newAsset);
      toast.success('Thêm tài sản thành công!');
      setName('');
      setValue('');
      setType(AssetTypes[0]);
      setIsShared(false);
      refreshData();
    } catch (error) {
      toast.error('Thêm tài sản thất bại.');
      console.error(error);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!profile) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tài sản này không?')) {
        try {
            await deleteAsset(id);
            toast.success('Đã xóa tài sản.');
            refreshData();
        } catch (error) {
            toast.error('Xóa tài sản thất bại.');
            console.error(error);
        }
    }
  };
  
  const handleValueUpdate = async (asset: Asset) => {
    if (!profile) return;
    const newValueStr = window.prompt(`Cập nhật giá trị cho "${asset.name}":`, asset.value.toString());
    const newValue = parseFloat(newValueStr || '');

    if (newValueStr === null) { // User cancelled
        return;
    }

    if (isNaN(newValue) || newValue < 0) {
        toast.error("Vui lòng nhập một giá trị hợp lệ.");
        return;
    }

    try {
        await updateAsset(asset.id, { value: newValue, date: Timestamp.now() });
        toast.success('Cập nhật giá trị tài sản thành công!');
        refreshData();
    } catch (err) {
        toast.error('Cập nhật tài sản thất bại.');
        console.error(err);
    }
  }


  if (loading) {
    return (
        <div className="flex justify-center items-center h-full">
            <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
        </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <Card className="border-red-300 border bg-red-50 max-w-lg text-center">
            <div className="text-red-500">
                <i className="fas fa-exclamation-triangle fa-3x"></i>
            </div>
            <h2 className="mt-4 text-xl font-bold text-slate-800">Lỗi kết nối</h2>
            <p className="mt-2 text-slate-600">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <h1 className="text-3xl font-bold text-slate-800">Quản lý Tài sản</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
            <h2 className="text-lg font-semibold mb-4">Thêm tài sản mới</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Tên tài sản</label>
                <Input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Vd: Quỹ hưu trí, Cổ phiếu VNM" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Giá trị (VND)</label>
                <Input type="number" value={value} onChange={(e) => setValue(e.target.value)} required min="0" step="1" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Loại tài sản</label>
                <Select value={type} onChange={(e) => setType(e.target.value)}>
                {AssetTypes.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </Select>
            </div>
            {profile?.coupleId && (
                <div className="relative flex items-start pt-2">
                    <div className="flex h-6 items-center">
                        <input id="isSharedAsset" type="checkbox" checked={isShared} onChange={e => setIsShared(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600" />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="isSharedAsset" className="font-medium text-slate-900">Tài sản chung</label>
                    </div>
                </div>
            )}
            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? 'Đang thêm...' : 'Thêm tài sản'}
            </Button>
            </form>
        </Card>
        <Card className="lg:col-span-2">
            <h2 className="text-lg font-semibold mb-4">Danh sách tài sản</h2>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Tên</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Loại</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cập nhật lần cuối</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Giá trị</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Hành động</th>
                </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                {assets.map(a => (
                    <tr key={a.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        <div className="flex items-center gap-2">
                            {a.ownerType === 'shared' && <i className="fas fa-user-friends text-slate-400" title="Tài sản chung"></i>}
                            <span>{a.name}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.type}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.date.toDate().toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold text-right">{formatCurrency(a.value)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-4">
                        {a.ownerId === profile?.uid && (
                            <>
                            <button onClick={() => handleValueUpdate(a)} className="text-blue-600 hover:text-blue-900" title="Cập nhật giá trị"><i className="fas fa-sync-alt"></i></button>
                            <button onClick={() => handleDelete(a.id)} className="text-red-600 hover:text-red-900" title="Xóa tài sản"><i className="fas fa-trash"></i></button>
                            </>
                        )}
                    </td>
                    </tr>
                ))}
                {assets.length === 0 && (
                    <tr>
                    <td colSpan={5} className="text-center py-4 text-slate-500">Chưa có tài sản nào được ghi lại.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </Card>
        </div>
    </div>
  );
};

export default AssetsPage;
