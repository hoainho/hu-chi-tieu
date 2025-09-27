import React, { useEffect } from 'react';
import Modal from './Modal';
import Button from './Button';

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const NotificationModal: React.FC<NotificationModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  autoClose = false,
  autoCloseDelay = 3000
}) => {
  // Auto close functionality
  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);

      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  const typeConfig = {
    success: {
      icon: '🎉',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      borderColor: 'border-green-200',
      buttonBg: 'bg-green-600 hover:bg-green-700',
    },
    error: {
      icon: '❌',
      iconBg: 'bg-red-100',
      iconColor: 'text-red-600',
      borderColor: 'border-red-200',
      buttonBg: 'bg-red-600 hover:bg-red-700',
    },
    warning: {
      icon: '⚠️',
      iconBg: 'bg-yellow-100',
      iconColor: 'text-yellow-600',
      borderColor: 'border-yellow-200',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700',
    },
    info: {
      icon: 'ℹ️',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-200',
      buttonBg: 'bg-blue-600 hover:bg-blue-700',
    }
  };

  const config = typeConfig[type];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="text-center">
        {/* Icon */}
        <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${config.iconBg} mb-4 animate-pulse-gentle`}>
          <span className="text-3xl">{config.icon}</span>
        </div>
        
        {/* Message */}
        <div className={`p-4 rounded-lg border ${config.borderColor} bg-gray-50 mb-6`}>
          <p className="text-gray-700 leading-relaxed">
            {message}
          </p>
        </div>
        
        {/* Auto close progress bar */}
        {autoClose && (
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div 
                className={`h-1 rounded-full ${config.buttonBg.split(' ')[0]} animate-progress`}
                style={{ 
                  animation: `progress ${autoCloseDelay}ms linear forwards`
                }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Tự động đóng sau {autoCloseDelay / 1000} giây
            </p>
          </div>
        )}
        
        {/* Action */}
        <Button
          onClick={onClose}
          className={`px-8 py-2 text-white transition-all duration-200 hover:scale-105 ${config.buttonBg}`}
        >
          Đóng
        </Button>
      </div>
    </Modal>
  );
};

export default NotificationModal;
