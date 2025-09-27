import React from 'react';
import { Account } from '../../types';
import { formatVietnameseCurrency } from '../../utils/vietnamCurrency';
import { formatDate } from '../../utils/dateHelpers';
import Button from '../ui/Button';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (accountId: string, accountName: string) => void;
  isEditing?: boolean;
}

const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  isEditing = false
}) => {
  const getAccountTypeIcon = (type: 'personal' | 'shared') => {
    return type === 'shared' ? 'fas fa-users' : 'fas fa-user';
  };

  const getAccountTypeColor = (type: 'personal' | 'shared') => {
    return type === 'shared' ? 'text-blue-600' : 'text-green-600';
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return 'text-green-600';
    if (balance < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`border border-gray-200 rounded-lg p-4 transition-all duration-200 ${
      isEditing ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:shadow-md'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <i className={`${getAccountTypeIcon(account.type)} ${getAccountTypeColor(account.type)} text-xl`}></i>
          <div>
            <h3 className="font-semibold text-gray-800">{account.name}</h3>
            <p className="text-sm text-gray-500 capitalize">
              Tài khoản {account.type === 'personal' ? 'Cá nhân' : 'Chia sẻ'} • {account.currency}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onEdit(account)}
            disabled={isEditing}
          >
            <i className="fas fa-edit mr-1"></i>
            Sửa
          </Button>
          
          <Button
            size="sm"
            variant="danger"
            onClick={() => onDelete(account.id, account.name)}
            disabled={isEditing}
          >
            <i className="fas fa-trash mr-1"></i>
            Xóa
          </Button>
        </div>
      </div>
      
      {/* Account Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
        <div>
          <span className="text-gray-600">Số dư:</span>
          <div className={`font-semibold ${getBalanceColor(account.balance)}`}>
            {formatVietnameseCurrency(account.balance)}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Envelopes:</span>
          <div className="font-semibold text-blue-600">
            {Object.keys(account.envelopes || {}).length}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Thành viên:</span>
          <div className="font-semibold text-purple-600">
            {account.ownerIds.length}
          </div>
        </div>
        <div>
          <span className="text-gray-600">Tạo lúc:</span>
          <div className="font-semibold text-gray-600">
            {formatDate(account.createdAt)}
          </div>
        </div>
      </div>
      
      {/* Envelope Summary */}
      {account.envelopes && Object.keys(account.envelopes).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Envelopes</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
            {Object.entries(account.envelopes).slice(0, 6).map(([name, envelope]) => {
              const envelopeData = envelope as { allocated: number; spent: number };
              const percentage = envelopeData.allocated > 0 ? (envelopeData.spent / envelopeData.allocated) * 100 : 0;
              return (
                <div key={name} className="flex items-center justify-between">
                  <span className="capitalize truncate">{name}</span>
                  <span className={`font-medium ${
                    percentage >= 90 ? 'text-red-600' :
                    percentage >= 75 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
            {Object.keys(account.envelopes).length > 6 && (
              <div className="text-gray-500">
                +{Object.keys(account.envelopes).length - 6} more
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountCard;
