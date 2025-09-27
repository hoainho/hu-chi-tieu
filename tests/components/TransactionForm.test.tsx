import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import TransactionForm from '../../components/transactions/TransactionForm';
import { EXPENSE_CATEGORIES } from '../../constants/categories';

// Mock dependencies
vi.mock('../../services/firebase', () => ({
  db: {},
  auth: {}
}));

vi.mock('../../hooks/useCurrencyRates', () => ({
  useCurrencyRates: () => ({
    rates: {
      USD: { rate: 24000, symbol: 'USD' },
      EUR: { rate: 26000, symbol: 'EUR' }
    },
    loading: false,
    convertToVND: (amount: number, currency: string) => {
      const rates = { USD: 24000, EUR: 26000 };
      return amount * (rates[currency as keyof typeof rates] || 1);
    },
    convertFromVND: (amount: number, currency: string) => {
      const rates = { USD: 24000, EUR: 26000 };
      return amount / (rates[currency as keyof typeof rates] || 1);
    }
  })
}));

vi.mock('../../context/UserDataContext', () => ({
  UserDataContext: {
    Consumer: ({ children }: any) => children({
      profile: {
        uid: 'test-user-id',
        name: 'Test User',
        preferences: { baseCurrency: 'VND' }
      },
      accounts: [
        { id: 'acc1', name: 'Tài khoản chính', balance: 10000000 },
        { id: 'acc2', name: 'Tài khoản phụ', balance: 5000000 }
      ]
    })
  }
}));

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: vi.fn((success) => {
    success({
      coords: {
        latitude: 10.8231,
        longitude: 106.6297
      }
    });
  })
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

describe('TransactionForm', () => {
  const mockProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    accounts: [
      { id: 'acc1', name: 'Tài khoản chính', balance: 10000000 },
      { id: 'acc2', name: 'Tài khoản phụ', balance: 5000000 }
    ],
    categories: EXPENSE_CATEGORIES,
    initialData: undefined
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Rendering', () => {
    it('should render all form fields', () => {
      render(<TransactionForm {...mockProps} />);

      expect(screen.getByLabelText(/số tiền/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mô tả/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/danh mục/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tài khoản/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /lưu giao dịch/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /hủy/i })).toBeInTheDocument();
    });

    it('should render categories correctly', () => {
      render(<TransactionForm {...mockProps} />);

      const categorySelect = screen.getByLabelText(/danh mục/i);
      expect(categorySelect).toBeInTheDocument();

      // Check if first few categories are present
      expect(screen.getByText('Ăn uống')).toBeInTheDocument();
      expect(screen.getByText('Nhà ở')).toBeInTheDocument();
      expect(screen.getByText('Đi lại')).toBeInTheDocument();
    });

    it('should render accounts in select dropdown', () => {
      render(<TransactionForm {...mockProps} />);

      const accountSelect = screen.getByLabelText(/tài khoản/i);
      expect(accountSelect).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('should show error when amount is empty', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /lưu giao dịch/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vui lòng nhập số tiền/i)).toBeInTheDocument();
      });
    });

    it('should show error when description is empty', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const amountInput = screen.getByLabelText(/số tiền/i);
      await user.type(amountInput, '100000');

      const submitButton = screen.getByRole('button', { name: /lưu giao dịch/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vui lòng nhập mô tả/i)).toBeInTheDocument();
      });
    });

    it('should show error when category is not selected', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const amountInput = screen.getByLabelText(/số tiền/i);
      const descriptionInput = screen.getByLabelText(/mô tả/i);

      await user.type(amountInput, '100000');
      await user.type(descriptionInput, 'Test transaction');

      const submitButton = screen.getByRole('button', { name: /lưu giao dịch/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/vui lòng chọn danh mục/i)).toBeInTheDocument();
      });
    });

    it('should validate amount is positive number', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const amountInput = screen.getByLabelText(/số tiền/i);
      await user.type(amountInput, '-100000');

      const submitButton = screen.getByRole('button', { name: /lưu giao dịch/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/số tiền phải lớn hơn 0/i)).toBeInTheDocument();
      });
    });
  });

  describe('Form Interaction', () => {
    it('should update amount input correctly', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const amountInput = screen.getByLabelText(/số tiền/i) as HTMLInputElement;
      await user.type(amountInput, '500000');

      expect(amountInput.value).toBe('500000');
    });

    it('should update description input correctly', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const descriptionInput = screen.getByLabelText(/mô tả/i) as HTMLInputElement;
      await user.type(descriptionInput, 'Ăn trưa');

      expect(descriptionInput.value).toBe('Ăn trưa');
    });

    it('should select category correctly', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const categorySelect = screen.getByLabelText(/danh mục/i);
      await user.selectOptions(categorySelect, 'food_drink');

      expect((categorySelect as HTMLSelectElement).value).toBe('food_drink');
    });

    it('should show subcategories when category is selected', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const categorySelect = screen.getByLabelText(/danh mục/i);
      await user.selectOptions(categorySelect, 'food_drink');

      await waitFor(() => {
        expect(screen.getByLabelText(/danh mục con/i)).toBeInTheDocument();
      });
    });
  });

  describe('Auto-categorization', () => {
    it('should auto-categorize based on description keywords', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const descriptionInput = screen.getByLabelText(/mô tả/i);
      await user.type(descriptionInput, 'Ăn trưa tại nhà hàng');

      // Trigger blur to activate auto-categorization
      await user.tab();

      await waitFor(() => {
        const categorySelect = screen.getByLabelText(/danh mục/i) as HTMLSelectElement;
        expect(categorySelect.value).toBe('food_drink');
      });
    });

    it('should auto-categorize grab as transportation', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const descriptionInput = screen.getByLabelText(/mô tả/i);
      await user.type(descriptionInput, 'Grab về nhà');
      await user.tab();

      await waitFor(() => {
        const categorySelect = screen.getByLabelText(/danh mục/i) as HTMLSelectElement;
        expect(categorySelect.value).toBe('transportation');
      });
    });
  });

  describe('Currency Conversion', () => {
    it('should show currency selector when multi-currency is enabled', () => {
      const propsWithMultiCurrency = {
        ...mockProps,
        enableMultiCurrency: true
      };

      render(<TransactionForm {...propsWithMultiCurrency} />);

      expect(screen.getByLabelText(/đơn vị tiền tệ/i)).toBeInTheDocument();
    });

    it('should convert USD to VND correctly', async () => {
      const user = userEvent.setup();
      const propsWithMultiCurrency = {
        ...mockProps,
        enableMultiCurrency: true
      };

      render(<TransactionForm {...propsWithMultiCurrency} />);

      const amountInput = screen.getByLabelText(/số tiền/i);
      const currencySelect = screen.getByLabelText(/đơn vị tiền tệ/i);

      await user.type(amountInput, '100');
      await user.selectOptions(currencySelect, 'USD');

      // Should show VND equivalent
      await waitFor(() => {
        expect(screen.getByText(/2\.400\.000 VNĐ/)).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with correct data', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockResolvedValue(undefined);
      const props = { ...mockProps, onSubmit: mockOnSubmit };

      render(<TransactionForm {...props} />);

      // Fill form
      await user.type(screen.getByLabelText(/số tiền/i), '500000');
      await user.type(screen.getByLabelText(/mô tả/i), 'Test transaction');
      await user.selectOptions(screen.getByLabelText(/danh mục/i), 'food_drink');
      await user.selectOptions(screen.getByLabelText(/tài khoản/i), 'acc1');

      // Submit
      await user.click(screen.getByRole('button', { name: /lưu giao dịch/i }));

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          amount: 500000,
          description: 'Test transaction',
          category: 'food_drink',
          accountId: 'acc1',
          originalAmount: 500000,
          originalCurrency: 'VND',
          exchangeRate: 1,
          date: expect.any(Date),
          type: 'private',
          ownerId: 'test-user-id'
        });
      });
    });

    it('should show loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 1000))
      );
      const props = { ...mockProps, onSubmit: mockOnSubmit };

      render(<TransactionForm {...props} />);

      // Fill form
      await user.type(screen.getByLabelText(/số tiền/i), '500000');
      await user.type(screen.getByLabelText(/mô tả/i), 'Test transaction');
      await user.selectOptions(screen.getByLabelText(/danh mục/i), 'food_drink');

      // Submit
      await user.click(screen.getByRole('button', { name: /lưu giao dịch/i }));

      expect(screen.getByText(/đang lưu/i)).toBeInTheDocument();
    });

    it('should handle submission error', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = vi.fn().mockRejectedValue(new Error('Network error'));
      const props = { ...mockProps, onSubmit: mockOnSubmit };

      render(<TransactionForm {...props} />);

      // Fill form
      await user.type(screen.getByLabelText(/số tiền/i), '500000');
      await user.type(screen.getByLabelText(/mô tả/i), 'Test transaction');
      await user.selectOptions(screen.getByLabelText(/danh mục/i), 'food_drink');

      // Submit
      await user.click(screen.getByRole('button', { name: /lưu giao dịch/i }));

      await waitFor(() => {
        expect(screen.getByText(/có lỗi xảy ra/i)).toBeInTheDocument();
      });
    });
  });

  describe('Voice Input', () => {
    it('should show voice input button', () => {
      render(<TransactionForm {...mockProps} />);

      expect(screen.getByRole('button', { name: /nhập bằng giọng nói/i })).toBeInTheDocument();
    });

    it('should process voice input correctly', async () => {
      const user = userEvent.setup();
      
      // Mock SpeechRecognition
      const mockSpeechRecognition = {
        start: vi.fn(),
        stop: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      (global as any).SpeechRecognition = vi.fn(() => mockSpeechRecognition);
      (global as any).webkitSpeechRecognition = vi.fn(() => mockSpeechRecognition);

      render(<TransactionForm {...mockProps} />);

      const voiceButton = screen.getByRole('button', { name: /nhập bằng giọng nói/i });
      await user.click(voiceButton);

      expect(mockSpeechRecognition.start).toHaveBeenCalled();
    });
  });

  describe('Location Services', () => {
    it('should capture location when available', async () => {
      render(<TransactionForm {...mockProps} />);

      await waitFor(() => {
        expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
      });
    });

    it('should show location indicator when location is captured', async () => {
      render(<TransactionForm {...mockProps} />);

      await waitFor(() => {
        expect(screen.getByText(/vị trí hiện tại/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper labels for all inputs', () => {
      render(<TransactionForm {...mockProps} />);

      expect(screen.getByLabelText(/số tiền/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/mô tả/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/danh mục/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/tài khoản/i)).toBeInTheDocument();
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const amountInput = screen.getByLabelText(/số tiền/i);
      amountInput.focus();

      await user.tab();
      expect(screen.getByLabelText(/mô tả/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/danh mục/i)).toHaveFocus();
    });

    it('should announce errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<TransactionForm {...mockProps} />);

      const submitButton = screen.getByRole('button', { name: /lưu giao dịch/i });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/vui lòng nhập số tiền/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
      });
    });
  });

  describe('Edit Mode', () => {
    const editTransaction = {
      id: 'txn1',
      amount: 250000,
      description: 'Existing transaction',
      category: 'food_drink',
      subcategory: 'Ăn trưa',
      accountId: 'acc1',
      date: new Date('2024-01-15'),
      originalAmount: 250000,
      originalCurrency: 'VND',
      exchangeRate: 1
    };

    it('should populate form with existing data in edit mode', () => {
      const props = { ...mockProps, initialData: editTransaction };
      render(<TransactionForm {...props} />);

      expect((screen.getByLabelText(/số tiền/i) as HTMLInputElement).value).toBe('250000');
      expect((screen.getByLabelText(/mô tả/i) as HTMLInputElement).value).toBe('Existing transaction');
      expect((screen.getByLabelText(/danh mục/i) as HTMLSelectElement).value).toBe('food_drink');
    });

    it('should show update button in edit mode', () => {
      const props = { ...mockProps, initialData: editTransaction };
      render(<TransactionForm {...props} />);

      expect(screen.getByRole('button', { name: /cập nhật giao dịch/i })).toBeInTheDocument();
    });
  });
});
