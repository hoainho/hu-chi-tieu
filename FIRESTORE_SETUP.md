# Firestore Setup Guide

## Firestore Indexes

Ứng dụng này cần các indexes để hoạt động tối ưu. Hiện tại code đã được sửa để tránh lỗi indexes bằng cách:
- Tách các compound queries thành multiple simple queries
- Sort dữ liệu trong memory thay vì database

## Cách tạo Indexes (Khuyến nghị cho Production)

### Phương pháp 1: Sử dụng Firebase CLI (Khuyến nghị)

1. Cài đặt Firebase CLI:
```bash
npm install -g firebase-tools
```

2. Login vào Firebase:
```bash
firebase login
```

3. Khởi tạo Firebase project:
```bash
firebase init firestore
```

4. Deploy indexes:
```bash
firebase deploy --only firestore:indexes
```

### Phương pháp 2: Tạo thủ công qua Console

Truy cập các links sau để tạo indexes:

1. **Transactions Index (ownerId + date)**:
   https://console.firebase.google.com/project/finance-management-34286/firestore/indexes

2. **Incomes Index (ownerId + date)**:
   https://console.firebase.google.com/project/finance-management-34286/firestore/indexes

3. **Assets Index (ownerId + date)**:
   https://console.firebase.google.com/project/finance-management-34286/firestore/indexes

4. **Categories Index (ownerId + name)**:
   https://console.firebase.google.com/project/finance-management-34286/firestore/indexes

### Cấu hình Indexes cần thiết:

**Collection: transactions**
- Fields: ownerId (Ascending), date (Descending)
- Fields: coupleId (Ascending), date (Descending)

**Collection: incomes**
- Fields: ownerId (Ascending), date (Descending)
- Fields: coupleId (Ascending), date (Descending)

**Collection: assets**
- Fields: ownerId (Ascending), date (Descending)
- Fields: coupleId (Ascending), date (Descending)

**Collection: categories**
- Fields: ownerId (Ascending), name (Ascending)

## Firestore Security Rules

Đảm bảo bạn có security rules phù hợp:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can read/write their own profile
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Users can read/write their own data
    match /transactions/{transactionId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         resource.data.coupleId != null);
    }
    
    match /incomes/{incomeId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         resource.data.coupleId != null);
    }
    
    match /assets/{assetId} {
      allow read, write: if request.auth != null && 
        (resource.data.ownerId == request.auth.uid || 
         resource.data.coupleId != null);
    }
    
    match /categories/{categoryId} {
      allow read, write: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    match /invites/{inviteId} {
      allow read, write: if request.auth != null;
    }
    
    match /couples/{coupleId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

Nếu vẫn gặp lỗi indexes:
1. Kiểm tra Firebase Console để xem indexes đã được tạo chưa
2. Đợi vài phút để indexes được build hoàn tất
3. Clear cache và reload ứng dụng
4. Kiểm tra Network tab trong DevTools để xem requests
