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
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);

  // Check if current type is a market asset
  const isMarketAssetType = ['stock', 'crypto', 'gold', 'mutual_fund'].includes(type);

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
    const asset = assets.find(a => a.id === id);
    if (window.confirm(`Bạn có chắc chắn muốn xóa tài sản "${asset?.name}" không?`)) {
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

  const handleBulkDelete = async () => {
    if (!profile || selectedAssets.length === 0) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa ${selectedAssets.length} tài sản đã chọn không?`)) {
      try {
        await Promise.all(selectedAssets.map(id => deleteAsset(id)));
        toast.success(`Đã xóa ${selectedAssets.length} tài sản.`);
        setSelectedAssets([]);
        await refreshAssets();
      } catch (error) {
        toast.error('Xóa tài sản thất bại.');
        console.error(error);
      }
    }
  };

  const findDuplicateAssets = () => {
    const duplicates: { [key: string]: Asset[] } = {};
    
    assets.forEach(asset => {
      // Group by name and type (and symbol for market assets)
      let key = `${asset.name.toLowerCase()}-${asset.type}`;
      if (isMarketAsset(asset) && asset.symbol) {
        key += `-${asset.symbol.toLowerCase()}`;
      }
      
      if (!duplicates[key]) {
        duplicates[key] = [];
      }
      duplicates[key].push(asset);
    });
    
    // Return only groups with more than 1 asset
    return Object.values(duplicates).filter(group => group.length > 1);
  };

  const handleMergeAssets = async (assetsToMerge: Asset[]) => {
    if (!profile || assetsToMerge.length < 2) return;
    
    try {
      const firstAsset = assetsToMerge[0];
      const restAssets = assetsToMerge.slice(1);
      
      let mergedData: any = { ...firstAsset };
      
      if (isMarketAsset(firstAsset)) {
        // For market assets, sum quantities and average purchase prices
        const totalQuantity = assetsToMerge.reduce((sum, asset) => {
          return sum + (isMarketAsset(asset) ? asset.quantity : 0);
        }, 0);
        
        const weightedPriceSum = assetsToMerge.reduce((sum, asset) => {
          if (isMarketAsset(asset)) {
            return sum + (asset.quantity * asset.purchasePrice);
          }
          return sum;
        }, 0);
        
        const avgPurchasePrice = weightedPriceSum / totalQuantity;
        
        mergedData = {
          ...mergedData,
          quantity: totalQuantity,
          purchasePrice: avgPurchasePrice,
          date: Timestamp.now()
        };
      } else {
        // For fixed value assets, sum values
        const totalValue = assetsToMerge.reduce((sum, asset) => {
          return sum + getAssetValue(asset);
        }, 0);
        
        mergedData = {
          ...mergedData,
          value: totalValue,
          date: Timestamp.now()
        };
      }
      
      // Update the first asset with merged data
      await updateAsset(firstAsset.id, mergedData);
      
      // Delete the rest
      await Promise.all(restAssets.map(asset => deleteAsset(asset.id)));
      
      toast.success(`Đã gộp ${assetsToMerge.length} tài sản thành công!`);
      await refreshAssets();
    } catch (error) {
      toast.error('Gộp tài sản thất bại.');
      console.error(error);
    }
  };

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAllAssets = () => {
    if (selectedAssets.length === assets.length) {
      setSelectedAssets([]);
    } else {
      setSelectedAssets(assets.map(a => a.id));
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

  const generateType = (type) => {
    switch (type) {
      case 'stock':
        return 'Cổ Phiếu';
      case 'crypto':
        return 'Coin';
      case 'gold':
        return 'Chỉ';
      case 'mutual_fund':
        return 'CCQ';
      case 'real_estate':
        return 'BĐS';
      case 'bond':
        return 'PST';
      case 'other':
        return 'Khác';
      default:
        return type;
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
                  <option value="mutual_fund">Chứng chỉ quỹ</option>
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
                    placeholder={generateType(type)} 
                    required 
                    min="0" 
                    step="0.01" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">Giá mua (VND/{generateType(type)})</label>
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
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Danh sách tài sản</h2>
              <div className="flex space-x-2">
                {findDuplicateAssets().length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={() => setShowMergeModal(true)}
                    className="text-sm"
                  >
                    <i className="fas fa-compress-arrows-alt mr-2"></i>
                    Gộp trùng ({findDuplicateAssets().length})
                  </Button>
                )}
                {selectedAssets.length > 0 && (
                  <Button
                    variant="secondary"
                    onClick={handleBulkDelete}
                    className="text-sm bg-red-100 text-red-800 hover:bg-red-200"
                  >
                    <i className="fas fa-trash mr-2"></i>
                    Xóa ({selectedAssets.length})
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedAssets.length === assets.length && assets.length > 0}
                        onChange={selectAllAssets}
                        className="rounded border-gray-300"
                      />
                    </th>
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
                    <tr key={a.id} className={selectedAssets.includes(a.id) ? 'bg-blue-50' : ''}>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedAssets.includes(a.id)}
                        onChange={() => toggleAssetSelection(a.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
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
                      {generateType(a.type)}
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
                            {formatCurrency(a.purchasePrice)}{a.type === 'crypto' ? '$' : ''}/{generateType(a.type)}
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
                    <td colSpan={7} className="text-center py-4 text-slate-500">Chưa có tài sản nào được ghi lại.</td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
        </Card>
        </div>
        
        {/* Merge Duplicates Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Gộp tài sản trùng lặp</h3>
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>
              
              <div className="space-y-6">
                {findDuplicateAssets().map((duplicateGroup, groupIndex) => {
                  const firstAsset = duplicateGroup[0];
                  const totalValue = duplicateGroup.reduce((sum, asset) => sum + getAssetValue(asset), 0);
                  
                  return (
                    <div key={groupIndex} className="border rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {firstAsset.name} ({firstAsset.type})
                            {isMarketAsset(firstAsset) && firstAsset.symbol && (
                              <span className="text-slate-500 ml-2">({firstAsset.symbol})</span>
                            )}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {duplicateGroup.length} tài sản trùng lặp - Tổng giá trị: {formatCurrency(totalValue)}
                          </p>
                        </div>
                        <Button
                          onClick={() => {
                            handleMergeAssets(duplicateGroup);
                            setShowMergeModal(false);
                          }}
                          className="text-sm"
                        >
                          <i className="fas fa-compress-arrows-alt mr-2"></i>
                          Gộp
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {duplicateGroup.map((asset, assetIndex) => (
                          <div key={asset.id} className="bg-slate-50 p-3 rounded">
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="font-medium text-sm">
                                  #{assetIndex + 1}: {asset.name}
                                </div>
                                {isMarketAsset(asset) ? (
                                  <div className="text-xs text-slate-600 mt-1">
                                    Số lượng: {asset.quantity.toLocaleString()}<br/>
                                    Giá mua: {formatCurrency(asset.purchasePrice)}<br/>
                                    Giá trị: {formatCurrency(getAssetValue(asset))}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-600 mt-1">
                                    Giá trị: {formatCurrency(getAssetValue(asset))}
                                  </div>
                                )}
                                <div className="text-xs text-slate-400 mt-1">
                                  Cập nhật: {asset.date.toDate().toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      <div className="mt-3 p-3 bg-blue-50 rounded text-sm">
                        <div className="font-medium text-blue-900 mb-1">
                          <i className="fas fa-info-circle mr-2"></i>
                          Kết quả sau khi gộp:
                        </div>
                        {isMarketAsset(firstAsset) ? (
                          <div className="text-blue-800">
                            Số lượng: {duplicateGroup.reduce((sum, asset) => sum + (isMarketAsset(asset) ? asset.quantity : 0), 0).toLocaleString()}<br/>
                            Giá mua trung bình: {formatCurrency(
                              duplicateGroup.reduce((sum, asset) => {
                                if (isMarketAsset(asset)) {
                                  return sum + (asset.quantity * asset.purchasePrice);
                                }
                                return sum;
                              }, 0) / duplicateGroup.reduce((sum, asset) => sum + (isMarketAsset(asset) ? asset.quantity : 0), 0)
                            )}
                          </div>
                        ) : (
                          <div className="text-blue-800">
                            Tổng giá trị: {formatCurrency(totalValue)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-end mt-6">
                <Button
                  variant="secondary"
                  onClick={() => setShowMergeModal(false)}
                >
                  Đóng
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default AssetsPage;
