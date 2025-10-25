# 🔐 Deploy Firestore Security Rules

## Vấn đề đã được fix

Đã thêm các quyền sau vào Firestore Security Rules:

### Transactions Collection
- ✅ **UPDATE**: Cho phép chỉnh sửa giao dịch
- ✅ **DELETE**: Cho phép xóa giao dịch

### Incomes Collection
- ✅ **UPDATE**: Cho phép chỉnh sửa thu nhập
- ✅ **DELETE**: Cho phép xóa thu nhập

### Spending Sources Collection
- ✅ **UPDATE**: Cho phép cập nhật nguồn chi tiêu
- ✅ **DELETE**: Cho phép xóa nguồn chi tiêu

### Assets Collection
- ✅ **UPDATE**: Cho phép cập nhật tài sản
- ✅ **DELETE**: Cho phép xóa tài sản

## Cách deploy rules lên Firebase

### Phương pháp 1: Sử dụng script tự động (Khuyến nghị)

```bash
# Cấp quyền thực thi cho script
chmod +x deploy-rules.sh

# Chạy script
./deploy-rules.sh
```

### Phương pháp 2: Deploy thủ công

```bash
# Đảm bảo đã đăng nhập Firebase
firebase login

# Deploy chỉ Firestore rules (không deploy toàn bộ app)
firebase deploy --only firestore:rules
```

### Phương pháp 3: Deploy toàn bộ Firestore (rules + indexes)

```bash
firebase deploy --only firestore
```

## Kiểm tra sau khi deploy

1. Mở Firebase Console: https://console.firebase.google.com
2. Chọn project của bạn
3. Vào **Firestore Database** → **Rules**
4. Kiểm tra xem rules đã được cập nhật chưa

## Lưu ý quan trọng

⚠️ **Bạn PHẢI deploy rules lên Firebase để các thay đổi có hiệu lực!**

Các thay đổi trong file `firestore.rules` chỉ có hiệu lực sau khi deploy lên Firebase. Nếu không deploy, bạn sẽ tiếp tục gặp lỗi:

```
Firestore operation failed: Missing or insufficient permissions.
```

## Xác minh rules đã hoạt động

Sau khi deploy, thử các thao tác sau trong app:

1. ✏️ Sửa một giao dịch (transaction)
2. 🗑️ Xóa một giao dịch
3. ✏️ Sửa một thu nhập (income)
4. 🗑️ Xóa một thu nhập

Nếu không còn lỗi permission, rules đã được deploy thành công! 🎉

## Troubleshooting

### Lỗi: Firebase CLI not found
```bash
npm install -g firebase-tools
```

### Lỗi: Not logged in
```bash
firebase login
```

### Lỗi: Wrong project
```bash
# Kiểm tra project hiện tại
firebase projects:list

# Chọn project đúng
firebase use <project-id>
```

### Xem logs deploy
```bash
firebase deploy --only firestore:rules --debug
```
