# 🔐 Firestore Rules - Simplified Approach

## Vấn đề

Mỗi lần thêm tính năng mới (collection mới), phải:
1. Viết rules cụ thể cho collection đó
2. Deploy rules lên Firebase
3. Dễ quên → Gặp lỗi "Missing or insufficient permissions"

## Giải pháp: Generic Pattern-Based Rules

Thay vì viết rules riêng cho từng collection, chúng ta sử dụng **pattern chung** cho tất cả collections có cấu trúc tương tự.

### Pattern: Owner-Based Collections

**Áp dụng cho**: Bất kỳ collection nào có field `ownerId`

```javascript
match /{collection}/{documentId} {
  // READ: Owner hoặc partner (nếu có coupleId)
  allow read: if isAuthenticated() && (
    isResourceOwner() || 
    hasPartnerAccess(resource.data.coupleId)
  );
  
  // CREATE: User phải set mình là owner
  allow create: if isAuthenticated() && isRequestOwner();
  
  // UPDATE: Chỉ owner mới update được
  allow update: if isAuthenticated() && isResourceOwner();
  
  // DELETE: Chỉ owner mới xóa được
  allow delete: if isAuthenticated() && isResourceOwner();
}
```

### Collections được cover tự động

✅ **transactions** - Giao dịch chi tiêu
✅ **incomes** - Thu nhập
✅ **spendingSources** - Nguồn chi tiêu
✅ **savingsGoals** - Quỹ tiết kiệm ⭐ NEW
✅ **savingsGoalTransactions** - Giao dịch quỹ ⭐ NEW
✅ **categories** - Danh mục
✅ **assets** - Tài sản
✅ **investments** - Đầu tư
✅ **budgets** - Ngân sách
✅ **Bất kỳ collection mới nào có `ownerId`** 🎉

## Lợi ích

### 1. ✅ Không cần sửa rules khi thêm tính năng mới
Chỉ cần đảm bảo collection mới có field `ownerId`, rules sẽ tự động hoạt động!

### 2. ✅ Bảo mật vẫn được đảm bảo
- User chỉ đọc/sửa/xóa data của mình
- Partner có thể truy cập nếu có `coupleId`
- Không ai có thể truy cập data của người khác

### 3. ✅ Dễ maintain
- 1 pattern thay vì 10+ rules riêng lẻ
- Dễ hiểu, dễ debug
- Ít code hơn = ít bug hơn

### 4. ✅ Linh hoạt
- Vẫn có thể override cho collections đặc biệt (users, accounts, couples)
- Thêm validation nếu cần

## So sánh

### ❌ Cách cũ (Specific Rules)
```javascript
// Phải viết riêng cho mỗi collection
match /transactions/{id} {
  allow read: if ...;
  allow create: if ...;
  allow update: if ...;
  allow delete: if ...;
}

match /incomes/{id} {
  allow read: if ...;
  allow create: if ...;
  allow update: if ...;
  allow delete: if ...;
}

match /savingsGoals/{id} {  // ← Phải thêm mỗi lần có tính năng mới!
  allow read: if ...;
  allow create: if ...;
  allow update: if ...;
  allow delete: if ...;
}

// ... 10+ collections khác
```

**Vấn đề**: 
- Phải copy-paste rules mỗi lần
- Dễ quên deploy
- Nhiều code trùng lặp

### ✅ Cách mới (Generic Pattern)
```javascript
// 1 rule cho TẤT CẢ collections có ownerId
match /{collection}/{documentId} {
  allow read: if isAuthenticated() && (
    isResourceOwner() || hasPartnerAccess(resource.data.coupleId)
  );
  
  allow create: if isAuthenticated() && isRequestOwner();
  allow update: if isAuthenticated() && isResourceOwner();
  allow delete: if isAuthenticated() && isResourceOwner();
}
```

**Lợi ích**:
- ✅ Thêm collection mới? Không cần sửa rules!
- ✅ Chỉ cần có `ownerId` là hoạt động
- ✅ Ít code, dễ maintain

## Cấu trúc Data yêu cầu

Để rules tự động hoạt động, collection mới cần có:

### Required Fields
```typescript
{
  ownerId: string;  // ← BẮT BUỘC: ID của user sở hữu
}
```

### Optional Fields (cho couple sharing)
```typescript
{
  ownerId: string;
  coupleId?: string;  // ← TÙY CHỌN: Nếu muốn share với partner
  ownerType?: 'private' | 'shared';
}
```

## Ví dụ: Thêm collection mới

### Bước 1: Tạo Type
```typescript
export interface NewFeature {
  id: string;
  name: string;
  ownerId: string;  // ← Có field này là đủ!
  coupleId?: string; // ← Optional cho sharing
  // ... các fields khác
}
```

### Bước 2: Tạo Service Function
```typescript
export const createNewFeature = async (data: Omit<NewFeature, 'id'>) => {
  const database = ensureDb();
  return await addDoc(collection(database, 'newFeatures'), data);
};
```

### Bước 3: Sử dụng
```typescript
await createNewFeature({
  name: 'Test',
  ownerId: profile.uid,  // ← Rules sẽ tự động check
  // ...
});
```

**Không cần sửa rules!** 🎉

## Collections đặc biệt (có override)

Một số collections có cấu trúc khác, cần rules riêng:

### 1. **users** - userId thay vì ownerId
```javascript
match /users/{userId} {
  allow read, write: if isAuthenticated() && request.auth.uid == userId;
}
```

### 2. **accounts** - ownerIds array thay vì ownerId
```javascript
match /accounts/{accountId} {
  allow read: if isAuthenticated() && 
    request.auth.uid in resource.data.ownerIds;
}
```

### 3. **couples** - members array
```javascript
match /couples/{coupleId} {
  allow read, write: if isAuthenticated() && 
    request.auth.uid in resource.data.members;
}
```

### 4. **Public collections** - rates, goldPrices
```javascript
match /rates/{rateId} {
  allow read: if true;  // Public read
  allow write: if false; // Only Cloud Functions
}
```

## Migration từ rules cũ

File backup đã được tạo: `firestore.rules.backup`

Nếu cần rollback:
```bash
cp firestore.rules.backup firestore.rules
firebase deploy --only firestore:rules
```

## Deploy

```bash
./deploy-rules.sh
# hoặc
firebase deploy --only firestore:rules
```

## Testing

Sau khi deploy, test các operations:

### ✅ Test CREATE
```typescript
// Should work: User tạo data với ownerId = uid của mình
await createSavingsGoal({
  name: 'Test',
  ownerId: currentUser.uid,
  // ...
});
```

### ❌ Test UNAUTHORIZED
```typescript
// Should fail: User tạo data với ownerId của người khác
await createSavingsGoal({
  name: 'Test',
  ownerId: 'other-user-id', // ← Sẽ bị reject
  // ...
});
```

### ✅ Test READ
```typescript
// Should work: User đọc data của mình
const goals = await getSavingsGoals(currentUser.uid);
```

### ✅ Test UPDATE
```typescript
// Should work: User update data của mình
await updateSavingsGoal(goalId, { name: 'Updated' });
```

### ✅ Test DELETE
```typescript
// Should work: User xóa data của mình
await deleteSavingsGoal(goalId);
```

## Tóm tắt

| Aspect | Cách cũ | Cách mới |
|--------|---------|----------|
| **Thêm collection mới** | Phải sửa rules | Không cần sửa |
| **Số lượng rules** | 10+ rules riêng | 1 pattern chung |
| **Bảo mật** | ✅ Tốt | ✅ Tốt |
| **Dễ maintain** | ❌ Khó | ✅ Dễ |
| **Dễ quên deploy** | ✅ Có | ❌ Không |

## Kết luận

✅ **Simplified rules** giải quyết vấn đề "phiền khi thêm tính năng mới"

✅ **Bảo mật vẫn đảm bảo** - không phải allow `*` cho tất cả

✅ **Future-proof** - Collection mới tự động hoạt động

🚀 **Deploy ngay để sử dụng!**
