import React, { useState } from 'react';
import { useAppSelector } from '../../store';
import toast from 'react-hot-toast';
import { Asset, AssetType, createFixedValueAsset, createMarketAsset, isMarketAsset, getAssetValue } from '../../types';
import { addAsset, deleteAsset, updateAsset } from '../../services/firestoreService';
import { Timestamp } from 'firebase/firestore';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';
import { useAssets } from '../../hooks/useAssets';

const AssetsPage: React.FC = () => {
  const { profile } = useAppSelector(state => state.user);
  const { assets, loading, error, refreshAssets } = useAssets();
  
  const [name, setName] = useState('');
  const [value, setValue] = useState('');
  const [quantity, setQuantity] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [symbol, setSymbol] = useState('');
  const [type, setType] = useState<AssetType>('savings');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isShared, setIsShared] = useState(false);

  // Check if current type is a market asset
  const isMarketAssetType = ['stock', 'crypto', 'gold'].includes(type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name) return;
    
    // Validate required fields based on asset type
    if (isMarketAssetType) {
      if (!quantity || !purchasePrice) {
        toast.error('Vui lòng nhập số lượng và giá mua cho tài sản này');
        return;
      }
    } else {
      if (!value) {
        toast.error('Vui lòng nhập giá trị tài sản');
        return;
      }
    }
    
    setIsSubmitting(true);
    
    let newAsset: Omit<Asset, 'id'>;
    
    const baseData = {
      name,
      type,
      date: Timestamp.now(),
      ownerType: (isShared && profile.coupleId ? 'shared' : 'private') as 'private' | 'shared',
      ownerId: profile.uid,
      ...(isShared && profile.coupleId && { coupleId: profile.coupleId }),
    };
    
    if (isMarketAssetType) {
      newAsset = createMarketAsset({
        ...baseData,
        type: type as 'stock' | 'crypto' | 'gold',
        quantity: parseFloat(quantity),
        purchasePrice: parseFloat(purchasePrice),
        ...(symbol && { symbol }),
      });
    } else {
      newAsset = createFixedValueAsset({
        ...baseData,
        type: type as 'savings' | 'real_estate' | 'bond' | 'other',
        value: parseFloat(value),
      });
    }

    try {
      await addAsset(newAsset);
      toast.success('Thêm tài sản thành công!');
      setName('');
      setValue('');
      setQuantity('');
      setPurchasePrice('');
      setSymbol('');
      setType('savings');
      setIsShared(false);
      await refreshAssets();
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
            await refreshAssets();
        } catch (error) {
            toast.error('Xóa tài sản thất bại.');
            console.error(error);
        }
    }
  };
  
  const handleValueUpdate = async (asset: Asset) => {
    if (!profile) return;
    
    if (isMarketAsset(asset)) {
      // For market assets, update quantity or purchase price
      const choice = window.confirm(
        `Cập nhật "${asset.name}":\nOK = Số lượng (${asset.quantity})\nCancel = Giá mua (${formatCurrency(asset.purchasePrice)})`
      );
      
      if (choice) {
        // Update quantity
        const newQuantityStr = window.prompt(`Cập nhật số lượng cho "${asset.name}":`, asset.quantity.toString());
        if (newQuantityStr === null) return;
        
        const newQuantity = parseFloat(newQuantityStr);
        if (isNaN(newQuantity) || newQuantity < 0) {
          toast.error("Vui lòng nhập số lượng hợp lệ.");
          return;
        }
        
        try {
          await updateAsset(asset.id, { quantity: newQuantity, date: Timestamp.now() });
          toast.success('Cập nhật số lượng thành công!');
          await refreshAssets();
        } catch (err) {
          toast.error('Cập nhật thất bại.');
          console.error(err);
        }
      } else {
        // Update purchase price
        const newPriceStr = window.prompt(`Cập nhật giá mua cho "${asset.name}":`, asset.purchasePrice.toString());
        if (newPriceStr === null) return;
        
        const newPrice = parseFloat(newPriceStr);
        if (isNaN(newPrice) || newPrice < 0) {
          toast.error("Vui lòng nhập giá hợp lệ.");
          return;
        }
        
        try {
          await updateAsset(asset.id, { purchasePrice: newPrice, date: Timestamp.now() });
          toast.success('Cập nhật giá mua thành công!');
          await refreshAssets();
        } catch (err) {
          toast.error('Cập nhật thất bại.');
          console.error(err);
        }
      }
    } else {
      // For fixed value assets, update value
      const currentValue = getAssetValue(asset);
      const newValueStr = window.prompt(`Cập nhật giá trị cho "${asset.name}":`, currentValue.toString());
      if (newValueStr === null) return;
      
      const newValue = parseFloat(newValueStr);
      if (isNaN(newValue) || newValue < 0) {
        toast.error("Vui lòng nhập giá trị hợp lệ.");
        return;
      }

      try {
        await updateAsset(asset.id, { value: newValue, date: Timestamp.now() });
        toast.success('Cập nhật giá trị thành công!');
        await refreshAssets();
      } catch (err) {
        toast.error('Cập nhật thất bại.');
        console.error(err);
      }
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
                <label className="block text-sm font-medium text-slate-700">Loại tài sản</label>
                <Select value={type} onChange={(e) => setType(e.target.value as AssetType)}>
                  <option value="savings">Tiền tiết kiệm</option>
                  <option value="stock">Chứng khoán</option>
                  <option value="crypto">Tiền điện tử</option>
                  <option value="gold">Vàng</option>
                  <option value="real_estate">Bất động sản</option>
                  <option value="bond">Trái phiếu</option>
                  <option value="other">Khác</option>
                </Select>
            </div>
            
            {isMarketAssetType ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Số lượng</label>
                  <Input 
                    type="number" 
                    value={quantity} 
                    onChange={(e) => setQuantity(e.target.value)} 
                    placeholder={type === 'stock' ? 'Số cổ phiếu' : type === 'crypto' ? 'Số coin' : 'Số lượng (chỉ/cây)'} 
                    required 
                    min="0" 
                    step="0.01" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Giá mua (VND/{type === 'stock' ? 'CP' : type === 'crypto' ? 'coin' : 'chỉ'})</label>
                  <Input 
                    type="number" 
                    value={purchasePrice} 
                    onChange={(e) => setPurchasePrice(e.target.value)} 
                    placeholder="Giá mua ban đầu" 
                    required 
                    min="0" 
                    step="0.01" 
                  />
                </div>
                {(type === 'stock' || type === 'crypto') && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700">Mã/Symbol (tùy chọn)</label>
                    <Input 
                      type="text" 
                      value={symbol} 
                      onChange={(e) => setSymbol(e.target.value)} 
                      placeholder={type === 'stock' ? 'VD: VIC, VCB' : 'VD: BTC, ETH'} 
                    />
                  </div>
                )}
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700">Giá trị (VND)</label>
                <Input 
                  type="number" 
                  value={value} 
                  onChange={(e) => setValue(e.target.value)} 
                  placeholder="Giá trị tài sản" 
                  required 
                  min="0" 
                  step="0.01" 
                />
              </div>
            )}
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Số lượng</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Cập nhật</th>
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
                            <div>
                              <div>{a.name}</div>
                              {isMarketAsset(a) && a.symbol && (
                                <div className="text-xs text-slate-500">{a.symbol}</div>
                              )}
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {a.type === 'savings' ? 'Tiết kiệm' :
                       a.type === 'stock' ? 'Chứng khoán' :
                       a.type === 'crypto' ? 'Crypto' :
                       a.type === 'gold' ? 'Vàng' :
                       a.type === 'real_estate' ? 'BĐS' :
                       a.type === 'bond' ? 'Trái phiếu' : 'Khác'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {isMarketAsset(a) ? (
                        <div>
                          <div>{a.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 4 })} {
                            a.type === 'stock' ? 'CP' :
                            a.type === 'crypto' ? a.symbol || 'coin' :
                            a.type === 'gold' ? (a.quantity >= 10 ? `${(a.quantity/10).toFixed(1)} cây` : `${a.quantity} chỉ`) :
                            'đơn vị'
                          }</div>
                          <div className="text-xs text-slate-400">
                            @ {formatCurrency(a.purchasePrice)}/{a.type === 'stock' ? 'CP' : a.type === 'crypto' ? 'coin' : 'chỉ'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{a.date.toDate().toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600 font-semibold text-right">
                      <div>{formatCurrency(getAssetValue(a))}</div>
                      {isMarketAsset(a) && a.marketValue && a.gainLoss !== undefined && (
                        <div className={`text-xs ${a.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {a.gainLoss >= 0 ? '+' : ''}{formatCurrency(a.gainLoss)} ({a.gainLossPercent?.toFixed(1)}%)
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {a.ownerId === profile?.uid && (
                            <div className="flex justify-end space-x-2">
                              <button 
                                onClick={() => handleValueUpdate(a)} 
                                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 hover:bg-blue-200 transition-colors"
                                title="Cập nhật giá trị"
                              >
                                <i className="fas fa-edit mr-1"></i>
                                Sửa
                              </button>
                              <button 
                                onClick={() => handleDelete(a.id)} 
                                className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 hover:bg-red-200 transition-colors"
                                title="Xóa tài sản"
                              >
                                <i className="fas fa-trash mr-1"></i>
                                Xóa
                              </button>
                            </div>
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
