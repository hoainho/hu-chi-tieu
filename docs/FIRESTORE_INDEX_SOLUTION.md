# 🔍 Firestore Composite Index - Giải pháp

## Vấn đề

Khi query Firestore với **nhiều điều kiện**, Firestore yêu cầu **composite index**:

```typescript
// ❌ Lỗi: Requires composite index
const q = query(
  collection(db, 'savingsGoals'),
  where('ownerId', '==', userId),
  orderBy('createdAt', 'desc')  // ← Kết hợp where + orderBy
);
```

**Error:**
```
FirebaseError: The query requires an index. 
You can create it here: https://console.firebase.google.com/...
```

## Tại sao cần composite index?

Firestore tự động tạo **single-field indexes**, nhưng khi kết hợp:
- `where()` + `orderBy()` trên **fields khác nhau**
- Nhiều `where()` conditions
- `where()` + `orderBy()` + `limit()`

→ Cần **composite index** (index kết hợp nhiều fields)

## Giải pháp

### Cách 1: Tạo Index (Production)

**Ưu điểm:**
- ✅ Query nhanh hơn (server-side sorting)
- ✅ Hiệu quả với dataset lớn
- ✅ Tối ưu cho production

**Cách làm:**
1. Click vào link trong error message
2. Firebase Console sẽ tự động điền thông tin
3. Click "Create Index"
4. Đợi vài phút để index được build

**Hoặc tạo thủ công:**

`firestore.indexes.json`:
```json
{
  "indexes": [
    {
      "collectionGroup": "savingsGoals",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "ownerId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    },
    {
      "collectionGroup": "savingsGoalTransactions",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "goalId",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "date",
          "order": "DESCENDING"
        }
      ]
    }
  ]
}
```

Deploy:
```bash
firebase deploy --only firestore:indexes
```

### Cách 2: Client-side Sorting (Đã áp dụng) ✅

**Ưu điểm:**
- ✅ Không cần tạo index
- ✅ Hoạt động ngay lập tức
- ✅ Đơn giản, dễ maintain

**Nhược điểm:**
- ⚠️ Chậm hơn với dataset lớn (>1000 items)
- ⚠️ Tốn bandwidth (fetch tất cả rồi sort)

**Implementation:**

```typescript
// ✅ Đã fix: Bỏ orderBy, sort ở client
export const getSavingsGoals = async (userId: string): Promise<SavingsGoal[]> => {
  const database = ensureDb();
  const goalsRef = collection(database, 'savingsGoals');
  
  // Chỉ filter theo ownerId (không cần index)
  const q = query(
    goalsRef,
    where('ownerId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  const goals = snapshot.docs.map(doc => ({ 
    id: doc.id, 
    ...doc.data() 
  } as SavingsGoal));
  
  // Sort ở client side
  return goals.sort((a, b) => {
    const aTime = a.createdAt?.toMillis() || 0;
    const bTime = b.createdAt?.toMillis() || 0;
    return bTime - aTime; // Newest first
  });
};
```

## Khi nào dùng cách nào?

### Dùng Client-side Sorting khi:
- ✅ Dataset nhỏ (<100 items per user)
- ✅ Development/Testing
- ✅ Muốn deploy nhanh
- ✅ Không muốn quản lý indexes

### Dùng Composite Index khi:
- ✅ Dataset lớn (>1000 items)
- ✅ Production với nhiều users
- ✅ Cần performance tối ưu
- ✅ Query phức tạp với nhiều conditions

## Collections đã fix

### 1. `savingsGoals`
**Query cũ:**
```typescript
where('ownerId', '==', userId) + orderBy('createdAt', 'desc')
// ❌ Requires index
```

**Query mới:**
```typescript
where('ownerId', '==', userId)
// ✅ No index needed
// Sort on client: goals.sort((a, b) => ...)
```

### 2. `savingsGoalTransactions`
**Query cũ:**
```typescript
where('goalId', '==', goalId) + orderBy('date', 'desc')
// ❌ Requires index
```

**Query mới:**
```typescript
where('goalId', '==', goalId)
// ✅ No index needed
// Sort on client: transactions.sort((a, b) => ...)
```

## Best Practices

### 1. Thiết kế query đơn giản
```typescript
// ✅ Good: Single where condition
query(collection, where('ownerId', '==', userId))

// ⚠️ Needs index: where + orderBy on different fields
query(
  collection, 
  where('ownerId', '==', userId),
  orderBy('createdAt', 'desc')
)

// ✅ Alternative: Sort on client
const results = await getDocs(query(...));
return results.sort((a, b) => ...);
```

### 2. Sử dụng subcollections
```typescript
// ❌ Bad: Query across all users
collection(db, 'transactions')
where('userId', '==', userId)

// ✅ Better: User-specific subcollection
collection(db, `users/${userId}/transactions`)
// No need to filter by userId!
```

### 3. Denormalize data khi cần
```typescript
// Thay vì query với nhiều conditions
// Lưu pre-computed data

interface SavingsGoal {
  // ... other fields
  latestTransactionDate: Timestamp; // ← Denormalized
  transactionCount: number;         // ← Denormalized
}

// Query đơn giản hơn
query(
  collection,
  where('ownerId', '==', userId),
  orderBy('latestTransactionDate', 'desc') // ← Single field
)
```

## Monitoring

Nếu sau này cần tạo indexes, check Firebase Console:

1. **Firestore → Indexes**
2. Xem "Index creation requests"
3. Tạo indexes cho queries được dùng nhiều nhất

## Tóm tắt

| Aspect | Client-side Sort | Composite Index |
|--------|------------------|-----------------|
| **Setup** | ✅ Instant | ⏳ Vài phút |
| **Performance (small)** | ✅ Fast | ✅ Fast |
| **Performance (large)** | ⚠️ Slow | ✅ Fast |
| **Bandwidth** | ⚠️ Higher | ✅ Lower |
| **Maintenance** | ✅ Easy | ⚠️ Need to manage |
| **Cost** | ⚠️ More reads | ✅ Optimized |

**Kết luận:** 
- ✅ Hiện tại dùng **client-side sorting** (đơn giản, đủ dùng)
- 🔮 Tương lai nếu có nhiều data → Tạo composite indexes

## Files đã fix

- `services/firestoreService.ts`
  - `getSavingsGoals()` - Client-side sort by createdAt
  - `getSavingsGoalTransactions()` - Client-side sort by date
