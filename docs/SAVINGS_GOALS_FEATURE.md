# 🎯 Tính năng Quỹ Tiết Kiệm Mục Tiêu (Savings Goals)

## Tổng quan

Tính năng **Quỹ Tiết Kiệm Mục Tiêu** cho phép người dùng tạo và quản lý các quỹ tiết kiệm cho các mục tiêu cụ thể trong tương lai, như:
- 🏖️ **Quỹ du lịch**: Tiết kiệm cho chuyến du lịch Hội An, Đà Lạt, v.v.
- 🆘 **Quỹ khẩn cấp/thất nghiệp**: Dự phòng cho các tình huống khẩn cấp
- 💼 **Quỹ kinh doanh**: Vốn để khởi nghiệp hoặc mở rộng kinh doanh
- 🎓 **Quỹ giáo dục**: Học phí, khóa học, đào tạo
- 🏠 **Quỹ mua nhà**: Tiết kiệm để mua nhà, đất
- 💰 **Quỹ khác**: Các mục tiêu tùy chỉnh khác

## Đặc điểm chính

### 1. Tạo Quỹ Tiết Kiệm
- **Tên quỹ**: Đặt tên mô tả cho quỹ (VD: "Quỹ du lịch Hội An 2025")
- **Mục tiêu**: Số tiền cần đạt được (VD: 10,000,000 VND)
- **Đóng góp hàng tháng**: Số tiền dự kiến nạp mỗi tháng (tùy chọn)
- **Thời hạn**: Ngày dự kiến hoàn thành mục tiêu (tùy chọn)
- **Loại quỹ**: Phân loại theo mục đích sử dụng

### 2. Nạp Tiền vào Quỹ (Deposit)
- Chọn nguồn tiền để trừ (từ Spending Sources)
- Nhập số tiền muốn nạp
- Thêm ghi chú (tùy chọn)
- Hệ thống tự động:
  - ✅ Cộng tiền vào quỹ
  - ✅ Trừ tiền từ nguồn chi tiêu đã chọn
  - ✅ Lưu lịch sử giao dịch
  - ✅ Cập nhật trạng thái "Hoàn thành" nếu đạt mục tiêu

### 3. Rút Tiền từ Quỹ (Withdraw)
- Chọn nguồn tiền để nhận (vào Spending Sources)
- Nhập số tiền muốn rút
- Thêm ghi chú (VD: "Chi tiêu cho chuyến du lịch Hội An")
- Hệ thống tự động:
  - ✅ Trừ tiền từ quỹ
  - ✅ Cộng tiền vào nguồn chi tiêu đã chọn
  - ✅ Lưu lịch sử giao dịch

### 4. Theo Dõi Tiến Độ
- **Progress Bar**: Hiển thị % hoàn thành mục tiêu
- **Số tiền hiện tại**: Tổng tiền đã tích lũy
- **Số tiền còn thiếu**: Số tiền cần nạp thêm để đạt mục tiêu
- **Trạng thái**: Active, Completed, Paused

### 5. Quản Lý Quỹ
- **Xem danh sách**: Tất cả quỹ với thông tin tổng quan
- **Chỉnh sửa**: Cập nhật thông tin quỹ (tên, mục tiêu, deadline)
- **Xóa quỹ**: Xóa quỹ không còn cần thiết
- **Lịch sử giao dịch**: Xem tất cả giao dịch nạp/rút của quỹ

## Luồng hoạt động

### Ví dụ: Quỹ Du Lịch Hội An

**Bước 1: Tạo quỹ**
```
Tên: "Quỹ du lịch Hội An 2025"
Mục tiêu: 10,000,000 VND
Đóng góp/tháng: 1,500,000 VND
Thời hạn: 31/12/2025
Loại: Du lịch
```

**Bước 2: Nạp tiền định kỳ**
```
Tháng 1: Nạp 1,500,000 VND từ "Tài khoản ngân hàng"
→ Quỹ: 0 → 1,500,000 VND
→ Ngân hàng: 20,000,000 → 18,500,000 VND

Tháng 2: Nạp 1,500,000 VND từ "Tài khoản ngân hàng"
→ Quỹ: 1,500,000 → 3,000,000 VND
→ Ngân hàng: 18,500,000 → 17,000,000 VND

... (tiếp tục 6 tháng)

Tháng 7: Nạp 1,000,000 VND
→ Quỹ: 9,000,000 → 10,000,000 VND ✅ Hoàn thành!
```

**Bước 3: Sử dụng quỹ**
```
Rút 8,000,000 VND vào "Ví tiền mặt" để chi tiêu du lịch
→ Quỹ: 10,000,000 → 2,000,000 VND
→ Ví tiền mặt: 500,000 → 8,500,000 VND

Ghi chú: "Chi tiêu cho chuyến du lịch Hội An 3 ngày 2 đêm"
```

## Kiến trúc kỹ thuật

### Database Schema

**Collection: `savingsGoals`**
```typescript
{
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  currentAmount: number;
  monthlyContribution?: number;
  category: 'travel' | 'emergency' | 'business' | 'education' | 'house' | 'other';
  deadline?: Timestamp;
  status: 'active' | 'completed' | 'paused';
  ownerType: 'private' | 'shared';
  ownerId: string;
  coupleId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Collection: `savingsGoalTransactions`**
```typescript
{
  id: string;
  goalId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  description?: string;
  date: Timestamp;
  ownerId: string;
  spendingSourceId?: string;
}
```

### Redux State Management

**Slice**: `savingsGoalSlice.ts`

**Actions**:
- `fetchSavingsGoals`: Lấy danh sách quỹ
- `createGoal`: Tạo quỹ mới
- `updateGoal`: Cập nhật thông tin quỹ
- `deleteGoal`: Xóa quỹ
- `depositToGoal`: Nạp tiền vào quỹ
- `withdrawFromGoal`: Rút tiền từ quỹ
- `fetchGoalTransactions`: Lấy lịch sử giao dịch

### Firestore Security Rules

```javascript
// Savings goals with couple sharing
match /savingsGoals/{goalId} {
  allow read: if request.auth != null && (
    resource.data.ownerId == request.auth.uid ||
    (resource.data.coupleId != null && hasPartnerAccess(resource.data.coupleId))
  );
  
  allow create: if request.auth != null && 
    request.resource.data.ownerId == request.auth.uid;
  
  allow update: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
  
  allow delete: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
}

// Savings goal transactions
match /savingsGoalTransactions/{transactionId} {
  allow read: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
  
  allow create: if request.auth != null && 
    request.resource.data.ownerId == request.auth.uid;
  
  allow delete: if request.auth != null && 
    resource.data.ownerId == request.auth.uid;
}
```

## Files Created/Modified

### New Files
1. **`types/index.ts`**: Added `SavingsGoal` and `SavingsGoalTransaction` interfaces
2. **`services/firestoreService.ts`**: Added CRUD functions for savings goals
3. **`store/slices/savingsGoalSlice.ts`**: Redux slice for savings goals
4. **`components/savings/SavingsGoalsPage.tsx`**: Main UI component
5. **`docs/SAVINGS_GOALS_FEATURE.md`**: This documentation

### Modified Files
1. **`store/index.ts`**: Added `savingsGoalReducer` to store
2. **`App.tsx`**: Added `/savings-goals` route
3. **`components/layout/Layout.tsx`**: Added "Quỹ Tiết Kiệm" menu item
4. **`firestore.rules`**: Added security rules for savings goals

## Tích hợp với Spending Sources

Tính năng này **tích hợp chặt chẽ** với Spending Sources:

### Khi Nạp Tiền (Deposit)
1. User chọn nguồn tiền (VD: "Tài khoản ngân hàng")
2. Nhập số tiền muốn nạp
3. Hệ thống:
   - Cộng tiền vào `savingsGoal.currentAmount`
   - Trừ tiền từ `spendingSource.balance`
   - Tạo transaction record

### Khi Rút Tiền (Withdraw)
1. User chọn nguồn tiền nhận (VD: "Ví tiền mặt")
2. Nhập số tiền muốn rút
3. Hệ thống:
   - Trừ tiền từ `savingsGoal.currentAmount`
   - Cộng tiền vào `spendingSource.balance`
   - Tạo transaction record

## Use Cases

### 1. Tiết kiệm cho Du Lịch
```
Mục tiêu: 15,000,000 VND cho chuyến du lịch Nhật Bản
Thời gian: 12 tháng
Đóng góp: 1,300,000 VND/tháng
```

### 2. Quỹ Khẩn Cấp
```
Mục tiêu: 50,000,000 VND (6 tháng lương)
Thời gian: 24 tháng
Đóng góp: 2,100,000 VND/tháng
```

### 3. Vốn Kinh Doanh
```
Mục tiêu: 100,000,000 VND để mở quán cafe
Thời gian: 18 tháng
Đóng góp: 5,600,000 VND/tháng
```

## Lợi ích

1. ✅ **Mục tiêu rõ ràng**: Biết chính xác cần tiết kiệm bao nhiêu
2. ✅ **Theo dõi tiến độ**: Xem được % hoàn thành theo thời gian thực
3. ✅ **Tự động hóa**: Tích hợp với spending sources, không cần tính toán thủ công
4. ✅ **Lịch sử đầy đủ**: Xem lại tất cả giao dịch nạp/rút
5. ✅ **Phân loại**: Quản lý nhiều quỹ cho nhiều mục tiêu khác nhau
6. ✅ **Động lực**: Progress bar và status giúp duy trì động lực tiết kiệm

## Roadmap tương lai

- [ ] **Tự động nạp tiền**: Thiết lập auto-deposit hàng tháng
- [ ] **Thông báo**: Nhắc nhở khi đến hạn đóng góp
- [ ] **Biểu đồ**: Visualize tiến độ theo thời gian
- [ ] **Chia sẻ quỹ**: Quỹ chung cho couple (shared goals)
- [ ] **Lãi suất**: Tính lãi suất cho quỹ tiết kiệm dài hạn
- [ ] **Templates**: Mẫu quỹ có sẵn cho các mục tiêu phổ biến

## Deploy

Nhớ deploy Firestore rules sau khi implement:

```bash
./deploy-rules.sh
# hoặc
firebase deploy --only firestore:rules
```
