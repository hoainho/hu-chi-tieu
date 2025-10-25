# 💰 Savings Goals & Available Balance Integration

## Tổng quan

Khi nạp tiền vào **Quỹ Tiết Kiệm**, số tiền đó cần được **ghi nhận là chi tiêu** trong Available Balance để tracking chính xác cash flow hàng tháng.

## Vấn đề

Khi nhận lương, một phần tiền sẽ được phân bổ vào các quỹ tiết kiệm:
- Quỹ du lịch: 1,000,000 VND/tháng
- Quỹ khẩn cấp: 2,000,000 VND/tháng
- Quỹ kinh doanh: 500,000 VND/tháng

→ **Tổng: 3,500,000 VND/tháng bị "hao hụt" từ tiền lương**

Nếu không tracking, Available Balance sẽ không phản ánh đúng số tiền thực tế có thể chi tiêu.

## Giải pháp

### 1. Thêm field `savingsDeducted` vào Available Balance

```typescript
export interface AvailableBalanceRecord {
  // ... existing fields
  incomeAdded: number;          // Thu nhập
  spendingDeducted: number;     // Chi tiêu thông thường
  investmentDeducted: number;   // Đầu tư
  savingsDeducted: number;      // ⭐ Nạp vào quỹ tiết kiệm
  netChange: number;            // Thay đổi ròng
}
```

### 2. Tracking Savings như một loại chi tiêu

```typescript
export interface AvailableBalanceTransaction {
  type: 'income' | 'spending' | 'investment' | 'savings'; // ⭐ Added 'savings'
  amount: number;
  description: string;
  // ...
}
```

## Luồng hoạt động

### Khi NẠP TIỀN vào Quỹ (Deposit)

```typescript
// 1. Nạp tiền vào savings goal
await depositToGoal({
  goalId: 'goal-123',
  amount: 1000000,
  description: 'Nạp vào quỹ du lịch tháng 10'
});

// 2. Trừ từ spending source
await updateBalance({
  spendingSourceId: 'bank-account',
  amount: 1000000,
  operation: 'subtract'
});

// 3. ⭐ Ghi nhận vào Available Balance (chi tiêu cho savings)
await deductSavingsFromBalance({
  userId: 'user-123',
  amount: 1000000,
  description: 'Nạp vào quỹ du lịch tháng 10',
  sourceId: 'goal-123'
});
```

**Kết quả:**
```
Available Balance tháng 10:
- Income Added: +20,000,000 (lương)
- Spending Deducted: -5,000,000 (chi tiêu thông thường)
- Investment Deducted: -2,000,000 (đầu tư)
- Savings Deducted: -1,000,000 ⭐ (nạp vào quỹ)
- Net Change: +12,000,000
```

### Khi RÚT TIỀN từ Quỹ (Withdraw)

```typescript
// 1. Rút tiền từ savings goal
await withdrawFromGoal({
  goalId: 'goal-123',
  amount: 5000000,
  description: 'Rút tiền cho chuyến du lịch Hội An'
});

// 2. Cộng vào spending source
await updateBalance({
  spendingSourceId: 'cash-wallet',
  amount: 5000000,
  operation: 'add'
});

// 3. ⭐ Hoàn lại vào Available Balance (reverse savings deduction)
await addSavingsWithdrawal({
  userId: 'user-123',
  amount: 5000000,
  description: 'Rút từ quỹ du lịch cho chuyến Hội An',
  sourceId: 'goal-123'
});
```

**Kết quả:**
```
Available Balance tháng 11:
- Savings Deducted: -1,000,000 (nạp tháng này)
- Savings Withdrawal: +5,000,000 ⭐ (rút từ quỹ cũ)
- Net effect: +4,000,000 (tăng available balance)
```

## Ví dụ thực tế

### Tháng 1-6: Tích lũy cho quỹ du lịch

```
Tháng 1:
- Lương: +20,000,000
- Chi tiêu: -8,000,000
- Nạp quỹ du lịch: -1,500,000 ⭐
- Available Balance: 10,500,000

Tháng 2:
- Lương: +20,000,000
- Chi tiêu: -7,500,000
- Nạp quỹ du lịch: -1,500,000 ⭐
- Available Balance: 11,000,000

... (tiếp tục 6 tháng)

Tổng nạp vào quỹ: 9,000,000 VND
```

### Tháng 7: Sử dụng quỹ du lịch

```
Tháng 7:
- Lương: +20,000,000
- Chi tiêu: -6,000,000
- Rút từ quỹ du lịch: +8,000,000 ⭐ (để chi tiêu du lịch)
- Available Balance: 22,000,000 (tăng vì rút từ quỹ)

→ Dùng 8,000,000 này để chi tiêu cho chuyến du lịch
```

## Lợi ích

### 1. ✅ Tracking chính xác cash flow

```
Available Balance Report - Tháng 10:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Thu nhập:              +20,000,000
Chi tiêu thông thường:  -5,000,000
Đầu tư:                 -2,000,000
Nạp quỹ tiết kiệm:      -3,500,000 ⭐
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Còn lại:                +9,500,000
```

### 2. ✅ Biết chính xác tiền có thể chi tiêu

Không bị nhầm lẫn giữa:
- **Tiền trong tài khoản ngân hàng**: 15,000,000 VND
- **Tiền thực tế có thể chi**: 9,500,000 VND (đã trừ savings)

### 3. ✅ Phân tích chi tiêu đầy đủ

```
Báo cáo tháng 10:
- Chi tiêu sinh hoạt: 5,000,000 (33%)
- Đầu tư:            2,000,000 (13%)
- Tiết kiệm:         3,500,000 (23%) ⭐
- Còn lại:           9,500,000 (63%)
```

### 4. ✅ Lập kế hoạch tài chính tốt hơn

Biết được mỗi tháng cần:
- Chi tiêu: ~5,000,000
- Đầu tư: ~2,000,000
- Tiết kiệm: ~3,500,000
- **Tổng cần**: ~10,500,000

→ Nếu lương < 10,500,000 → Cần điều chỉnh!

## Implementation Details

### Service Layer

**File**: `services/availableBalanceService.ts`

```typescript
// Deduct when depositing to savings goal
async deductSavings(
  userId: string,
  amount: number,
  description: string,
  sourceId: string,
  coupleId?: string
): Promise<void>

// Add back when withdrawing from savings goal
async addSavingsWithdrawal(
  userId: string,
  amount: number,
  description: string,
  sourceId: string,
  coupleId?: string
): Promise<void>
```

### Redux Actions

**File**: `store/slices/availableBalanceSlice.ts`

```typescript
export const deductSavingsFromBalance = createAsyncThunk(
  'availableBalance/deductSavings',
  async ({ userId, amount, description, sourceId, coupleId }) => {
    await availableBalanceService.deductSavings(...);
    return await availableBalanceService.getCurrentBalance(...);
  }
);

export const addSavingsWithdrawal = createAsyncThunk(
  'availableBalance/addSavingsWithdrawal',
  async ({ userId, amount, description, sourceId, coupleId }) => {
    await availableBalanceService.addSavingsWithdrawal(...);
    return await availableBalanceService.getCurrentBalance(...);
  }
);
```

### UI Integration

**File**: `components/savings/SavingsGoalsPage.tsx`

```typescript
// When depositing to goal
await dispatch(depositToGoal({ ... }));
await dispatch(updateBalance({ operation: 'subtract', ... }));
await dispatch(deductSavingsFromBalance({ ... })); // ⭐ Track as expense

// When withdrawing from goal
await dispatch(withdrawFromGoal({ ... }));
await dispatch(updateBalance({ operation: 'add', ... }));
await dispatch(addSavingsWithdrawal({ ... })); // ⭐ Add back to balance
```

## Database Schema

### Available Balance Record

```typescript
{
  userId: "user-123",
  month: "2024-10",
  balance: 9500000,
  incomeAdded: 20000000,
  spendingDeducted: 5000000,
  investmentDeducted: 2000000,
  savingsDeducted: 3500000,      // ⭐ NEW
  netChange: 9500000,
  updatedAt: Timestamp,
  createdAt: Timestamp
}
```

### Available Balance Transaction

```typescript
{
  userId: "user-123",
  type: "savings",                // ⭐ NEW type
  amount: -1500000,               // Negative for deposit
  description: "Nạp vào quỹ du lịch",
  sourceId: "goal-123",
  balanceBefore: 11000000,
  balanceAfter: 9500000,
  timestamp: Timestamp
}
```

## Testing

### Test Deposit

```typescript
// 1. Check balance before
const balanceBefore = await getCurrentBalance(userId);
// Expected: 10,000,000

// 2. Deposit to savings goal
await depositToGoal({ amount: 1000000 });
await deductSavingsFromBalance({ amount: 1000000 });

// 3. Check balance after
const balanceAfter = await getCurrentBalance(userId);
// Expected: 9,000,000 ✅
```

### Test Withdrawal

```typescript
// 1. Check balance before
const balanceBefore = await getCurrentBalance(userId);
// Expected: 9,000,000

// 2. Withdraw from savings goal
await withdrawFromGoal({ amount: 5000000 });
await addSavingsWithdrawal({ amount: 5000000 });

// 3. Check balance after
const balanceAfter = await getCurrentBalance(userId);
// Expected: 14,000,000 ✅
```

## Tóm tắt

| Action | Spending Source | Savings Goal | Available Balance |
|--------|----------------|--------------|-------------------|
| **Deposit** | -1,000,000 | +1,000,000 | -1,000,000 ⭐ |
| **Withdraw** | +5,000,000 | -5,000,000 | +5,000,000 ⭐ |

✅ **Available Balance luôn phản ánh đúng số tiền thực tế có thể chi tiêu**

✅ **Tracking đầy đủ: Thu nhập - Chi tiêu - Đầu tư - Tiết kiệm = Còn lại**

✅ **Lập kế hoạch tài chính chính xác hơn**
