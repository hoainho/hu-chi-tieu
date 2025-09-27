import React from 'react';
import { SupportedCurrency } from '../../types';
import { AccountFormData } from '../../hooks/useAccountsManager';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';

interface AccountFormProps {
  formData: AccountFormData;
  onUpdateFormData: (updates: Partial<AccountFormData>) => void;
  onSubmit: (data: AccountFormData) => Promise<boolean>;
  onCancel?: () => void;
  isEditing?: boolean;
  isSubmitting?: boolean;
  title?: string;
}

const AccountForm: React.FC<AccountFormProps> = ({
  formData,
  onUpdateFormData,
  onSubmit,
  onCancel,
  isEditing = false,
  isSubmitting = false,
  title
}) => {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const success = await onSubmit(formData);
    if (success && onCancel) {
      onCancel();
    }
  };

  return (
    <Card className={isEditing ? 'border-2 border-blue-500' : ''}>
      <h2 className="text-lg font-semibold mb-4">
        {title || (isEditing ? 'Chỉnh sửa tài khoản' : 'Tạo Tài khoản Mới')}
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Account Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tên Tài khoản *
          </label>
          <Input
            type="text"
            value={formData.name}
            onChange={(e) => onUpdateFormData({ name: e.target.value })}
            placeholder="VD: Ngân sách cá nhân, Tài khoản gia đình"
            required
            disabled={isSubmitting}
          />
        </div>
        
        {/* Account Type */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Loại Tài khoản
            </label>
            <Select
              value={formData.type}
              onChange={(e) => onUpdateFormData({ 
                type: e.target.value as 'personal' | 'shared' 
              })}
              disabled={isSubmitting}
            >
              <option value="personal">Cá nhân</option>
              <option value="shared">Chia sẻ</option>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.type === 'shared' 
                ? 'Có thể chia sẻ với đối tác hoặc thành viên gia đình'
                : 'Chỉ bạn mới có thể truy cập tài khoản này'
              }
            </p>
          </div>
        )}
        
        {/* Currency */}
        {!isEditing && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Đơn vị Tiền tệ
            </label>
            <Select
              value={formData.currency}
              onChange={(e) => onUpdateFormData({ 
                currency: e.target.value as SupportedCurrency 
              })}
              disabled={isSubmitting}
            >
              <option value="VND">VND (Việt Nam Đồng)</option>
              <option value="USD">USD (Đô la Mỹ)</option>
              <option value="EUR">EUR (Euro)</option>
              <option value="JPY">JPY (Yên Nhật)</option>
            </Select>
          </div>
        )}
        
        {/* Initial Balance */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {isEditing ? 'Số dư hiện tại' : 'Số dư ban đầu'}
          </label>
          <Input
            type="number"
            value={formData.balance}
            onChange={(e) => onUpdateFormData({ 
              balance: parseFloat(e.target.value) || 0 
            })}
            placeholder="0"
            min="0"
            step="0.01"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            {isEditing 
              ? 'Cập nhật số dư hiện tại của tài khoản'
              : 'Số tiền ban đầu trong tài khoản (có thể để 0)'
            }
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !formData.name.trim()}
            className="flex-1"
          >
            {isSubmitting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                {isEditing ? 'Đang cập nhật...' : 'Đang tạo...'}
              </>
            ) : (
              <>
                <i className={`fas ${isEditing ? 'fa-save' : 'fa-plus'} mr-2`}></i>
                {isEditing ? 'Lưu thay đổi' : 'Tạo Tài khoản'}
              </>
            )}
          </Button>
          
          {onCancel && (
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
};

export default AccountForm;
