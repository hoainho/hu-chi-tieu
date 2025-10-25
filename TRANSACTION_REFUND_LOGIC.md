# 💰 Transaction & Income Refund Logic

## Tổng quan

Khi xóa giao dịch chi tiêu hoặc thu nhập, hệ thống sẽ tự động điều chỉnh số dư của nguồn tiền (spending source) tương ứng.

## Logic hoàn tiền

### 1. Xóa Chi Tiêu (Transaction)

Khi xóa một giao dịch chi tiêu:
- ✅ **Hoàn lại tiền** vào nguồn tiền đã bị trừ
- 🔄 Operation: `add` (cộng tiền vào spending source)
- 📝 Description: "Hoàn tiền từ giao dịch đã xóa: [tên giao dịch]"

**Ví dụ:**
```
Tạo chi tiêu: -100,000 VND từ "Ví tiền mặt"
→ Ví tiền mặt: 500,000 → 400,000

Xóa chi tiêu: +100,000 VND vào "Ví tiền mặt"
→ Ví tiền mặt: 400,000 → 500,000 (hoàn lại)
```

### 2. Xóa Thu Nhập (Income)

Khi xóa một thu nhập:
- ✅ **Trừ lại tiền** từ nguồn tiền đã được nạp
- 🔄 Operation: `subtract` (trừ tiền từ spending source)
- 📝 Description: "Hoàn trả từ thu nhập đã xóa: [tên thu nhập]"

**Ví dụ:**
```
Tạo thu nhập: +1,000,000 VND vào "Tài khoản ngân hàng"
→ Tài khoản: 5,000,000 → 6,000,000

Xóa thu nhập: -1,000,000 VND từ "Tài khoản ngân hàng"
→ Tài khoản: 6,000,000 → 5,000,000 (hoàn lại)
```

## Implementation Details

### Transaction Type Update

Đã thêm field `spendingSourceId` vào `Transaction` interface:

```typescript
export interface Transaction {
  // ... existing fields
  spendingSourceId?: string; // Link to spending source where money was deducted
}
```

### Khi tạo Transaction

```typescript
const newTransaction: Omit<Transaction, 'id'> = {
  // ... other fields
  spendingSourceId: selectedSpendingSource, // Save for refund on delete
};
```

### Khi xóa Transaction

```typescript
// 1. Tìm transaction để lấy thông tin spending source
const transactionToDelete = transactions.find(t => t.id === deleteModal.transactionId);

// 2. Xóa transaction
await dispatch(removeTransaction({ transactionId, userId }));

// 3. Hoàn lại tiền vào spending source
if (transactionToDelete?.spendingSourceId) {
  await dispatch(updateBalance({
    spendingSourceId: transactionToDelete.spendingSourceId,
    amount: transactionToDelete.amount,
    operation: 'add', // Hoàn lại tiền
    description: `Hoàn tiền từ giao dịch đã xóa: ${transactionName}`
  }));
}
```

### Khi xóa Income

```typescript
// 1. Tìm income để lấy thông tin spending source
const incomeToDelete = incomes.find(i => i.id === id);

// 2. Xóa income
await deleteIncome(id);

// 3. Trừ lại tiền từ spending source
if (incomeToDelete?.spendingSourceId) {
  await dispatch(updateBalance({
    spendingSourceId: incomeToDelete.spendingSourceId,
    amount: incomeToDelete.amount,
    operation: 'subtract', // Trừ lại tiền
    description: `Hoàn trả từ thu nhập đã xóa: ${incomeName}`
  }));
}
```

## Error Handling

Nếu việc hoàn tiền thất bại:
- ⚠️ Ghi log warning nhưng không fail toàn bộ operation
- ✅ Transaction/Income vẫn được xóa thành công
- 📝 User vẫn nhận được notification thành công

```typescript
try {
  await dispatch(updateBalance({...}));
} catch (balanceError) {
  console.warn('Failed to refund to spending source:', balanceError);
  // Don't fail the whole operation
}
```

## Benefits

1. ✅ **Tính toán chính xác**: Số dư nguồn tiền luôn đúng
2. ✅ **Audit trail**: Có description rõ ràng cho mỗi thao tác
3. ✅ **User experience**: Tự động điều chỉnh, không cần thao tác thủ công
4. ✅ **Consistency**: Đảm bảo dữ liệu nhất quán giữa transactions và spending sources

## Testing Checklist

- [ ] Tạo transaction với spending source → Kiểm tra số dư giảm
- [ ] Xóa transaction → Kiểm tra số dư tăng lại
- [ ] Tạo income với spending source → Kiểm tra số dư tăng
- [ ] Xóa income → Kiểm tra số dư giảm lại
- [ ] Xóa transaction cũ (không có spendingSourceId) → Không crash
- [ ] Xóa khi spending source đã bị xóa → Không crash
