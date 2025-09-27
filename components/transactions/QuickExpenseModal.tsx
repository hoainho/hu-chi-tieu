import React, { useState, useEffect, useRef } from 'react';
import { X, Mic, MicOff, Calculator, Clock, MapPin } from 'lucide-react';
import { EXPENSE_CATEGORIES, findCategoryByKeywords } from '../../constants/categories';
import { formatCurrency } from '../../utils/formatters';

interface QuickExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expense: QuickExpenseData) => Promise<void>;
  accounts: Array<{ id: string; name: string; balance: number }>;
}

interface QuickExpenseData {
  amount: number;
  description: string;
  category: string;
  subcategory?: string;
  accountId: string;
  envelope?: string;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
}

interface VoiceRecognitionResult {
  transcript: string;
  confidence: number;
}

const QuickExpenseModal: React.FC<QuickExpenseModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  accounts
}) => {
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [selectedEnvelope, setSelectedEnvelope] = useState<string>('');
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [showCalculator, setShowCalculator] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState<string[]>([]);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Khởi tạo Speech Recognition
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'vi-VN';
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          processVoiceInput(transcript);
          setIsListening(false);
        };
        
        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
        };
        
        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
  }, []);

  // Lấy vị trí hiện tại
  useEffect(() => {
    if (isOpen && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => setLocation(position),
        (error) => console.warn('Không thể lấy vị trí:', error),
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [isOpen]);

  // Auto-select account đầu tiên
  useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id);
    }
  }, [accounts, selectedAccount]);

  // Xử lý voice input
  const processVoiceInput = (transcript: string) => {
    console.log('Voice transcript:', transcript);
    
    // Parse amount từ transcript
    const amountMatch = transcript.match(/(\d+(?:\.\d+)?)\s*(?:nghìn|ngàn|k|triệu|tr|m)/i);
    if (amountMatch) {
      let parsedAmount = parseFloat(amountMatch[1]);
      const unit = amountMatch[2]?.toLowerCase();
      
      if (unit?.includes('nghìn') || unit?.includes('ngàn') || unit === 'k') {
        parsedAmount *= 1000;
      } else if (unit?.includes('triệu') || unit === 'tr' || unit === 'm') {
        parsedAmount *= 1000000;
      }
      
      setAmount(parsedAmount.toString());
    }
    
    // Set description
    setDescription(transcript);
    
    // Auto-categorize
    const suggestedCategory = findCategoryByKeywords(transcript);
    if (suggestedCategory) {
      setSelectedCategory(suggestedCategory.id);
      
      // Auto-select subcategory nếu có
      const subcategoryMatch = suggestedCategory.subcategories.find(sub =>
        transcript.toLowerCase().includes(sub.toLowerCase())
      );
      if (subcategoryMatch) {
        setSelectedSubcategory(subcategoryMatch);
      }
    }
  };

  // Bắt đầu voice recognition
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  // Dừng voice recognition
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  // Calculator functions
  const handleCalculatorInput = (value: string) => {
    if (value === '=') {
      try {
        const result = eval(amount.replace(/[^0-9+\-*/().]/g, ''));
        setAmount(result.toString());
      } catch {
        setAmount('');
      }
    } else if (value === 'C') {
      setAmount('');
    } else if (value === '⌫') {
      setAmount(prev => prev.slice(0, -1));
    } else {
      setAmount(prev => prev + value);
    }
  };

  // Quick amount buttons
  const quickAmounts = [
    { label: '20k', value: 20000 },
    { label: '50k', value: 50000 },
    { label: '100k', value: 100000 },
    { label: '200k', value: 200000 },
    { label: '500k', value: 500000 },
    { label: '1tr', value: 1000000 }
  ];

  // Recent descriptions
  const recentDescriptions = [
    'Ăn trưa',
    'Cà phê',
    'Xăng xe',
    'Grab',
    'Siêu thị',
    'Ăn tối'
  ];

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !description || !selectedCategory || !selectedAccount) {
      alert('Vui lòng điền đầy đủ thông tin');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const expenseData: QuickExpenseData = {
        amount: parseFloat(amount),
        description,
        category: selectedCategory,
        subcategory: selectedSubcategory || undefined,
        accountId: selectedAccount,
        envelope: selectedEnvelope || undefined,
        location: location ? {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
          address: 'Vị trí hiện tại' // Có thể reverse geocode sau
        } : undefined
      };

      await onSubmit(expenseData);
      
      // Reset form
      setAmount('');
      setDescription('');
      setSelectedCategory('');
      setSelectedSubcategory('');
      setSelectedEnvelope('');
      
      onClose();
    } catch (error) {
      console.error('Lỗi thêm giao dịch:', error);
      alert('Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        handleSubmit(e as any);
      } else if (e.key === ' ' && e.ctrlKey) {
        e.preventDefault();
        isListening ? stopListening() : startListening();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isListening]);

  if (!isOpen) return null;

  const selectedCategoryData = EXPENSE_CATEGORIES.find(cat => cat.id === selectedCategory);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Chi tiêu nhanh</h2>
            <p className="text-sm text-gray-600">Nhập giao dịch trong vài giây</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Voice Input */}
          <div className="text-center">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening 
                  ? 'bg-red-500 text-white animate-pulse' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>
            <p className="text-sm text-gray-600 mt-2">
              {isListening ? 'Đang nghe...' : 'Nhấn để nói (Ctrl+Space)'}
            </p>
            <p className="text-xs text-gray-500">
              VD: "Chi 50 nghìn ăn trưa"
            </p>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số tiền *
            </label>
            <div className="relative">
              <input
                type="text"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full text-2xl font-bold text-center p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowCalculator(!showCalculator)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-gray-600"
              >
                <Calculator className="w-5 h-5" />
              </button>
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-6 gap-2 mt-3">
              {quickAmounts.map(({ label, value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setAmount(value.toString())}
                  className="py-2 px-3 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mô tả *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="VD: Ăn trưa, Cà phê..."
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            
            {/* Recent Descriptions */}
            <div className="flex flex-wrap gap-2 mt-2">
              {recentDescriptions.map((desc) => (
                <button
                  key={desc}
                  type="button"
                  onClick={() => setDescription(desc)}
                  className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                >
                  {desc}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Danh mục *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {EXPENSE_CATEGORIES.slice(0, 9).map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(category.id);
                    setSelectedSubcategory('');
                  }}
                  className={`p-3 rounded-xl border-2 transition-all ${
                    selectedCategory === category.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{category.icon}</div>
                  <div className="text-xs font-medium text-gray-700">
                    {category.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Subcategory */}
          {selectedCategoryData && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Danh mục con
              </label>
              <select
                value={selectedSubcategory}
                onChange={(e) => setSelectedSubcategory(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Chọn danh mục con...</option>
                {selectedCategoryData.subcategories.map((sub) => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}

          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tài khoản *
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} - {formatCurrency(account.balance)}
                </option>
              ))}
            </select>
          </div>

          {/* Location Info */}
          {location && (
            <div className="flex items-center space-x-2 text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
              <MapPin className="w-4 h-4" />
              <span>Vị trí hiện tại đã được lưu</span>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !amount || !description || !selectedCategory}
              className="flex-1 py-3 px-4 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </div>
        </form>

        {/* Calculator Modal */}
        {showCalculator && (
          <div className="absolute inset-0 bg-white rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Máy tính</h3>
              <button
                onClick={() => setShowCalculator(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="text-right text-2xl font-mono mb-4 p-4 bg-gray-100 rounded-xl">
              {amount || '0'}
            </div>
            
            <div className="grid grid-cols-4 gap-3">
              {['C', '⌫', '/', '*', '7', '8', '9', '-', '4', '5', '6', '+', '1', '2', '3', '=', '0', '00', '.', '='].map((btn, idx) => (
                <button
                  key={idx}
                  onClick={() => handleCalculatorInput(btn)}
                  className={`p-4 rounded-xl font-semibold transition-colors ${
                    ['='].includes(btn) ? 'bg-blue-500 text-white col-span-1' :
                    ['C', '⌫'].includes(btn) ? 'bg-red-100 text-red-700' :
                    ['/', '*', '-', '+'].includes(btn) ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {btn}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Extend Window interface for Speech Recognition
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export default QuickExpenseModal;
