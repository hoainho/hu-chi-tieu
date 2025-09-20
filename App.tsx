import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import ManagementPage from './components/management/ManagementPage';
import AssetsPage from './components/assets/AssetsPage';
import Layout from './components/layout/Layout';
import CouplePage from './components/couple/CouplePage';
import { AuthContext } from './context/AuthContext';
import { UserDataProvider } from './context/UserDataContext';
import { Toaster } from 'react-hot-toast';
import { isFirebaseConfigured } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import Card from './components/ui/Card';

const FirebaseConfigWarning: React.FC = () => (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <Card className="w-full max-w-2xl border-2 border-red-500">
            <div className="text-center">
                <i className="fas fa-cogs text-5xl text-red-600 mb-4"></i>
                <h1 className="text-2xl font-bold text-slate-800">Yêu Cầu Cấu Hình Firebase</h1>
                <p className="text-slate-600 mt-2">
                    Ứng dụng không thể kết nối đến cơ sở dữ liệu vì nó chưa được cấu hình.
                </p>
            </div>
            <div className="mt-6 text-left bg-slate-50 p-4 rounded-lg">
                <h2 className="font-semibold text-slate-700">Cách khắc phục:</h2>
                <ol className="list-decimal list-inside mt-2 space-y-2 text-slate-600">
                    <li>
                        Thực hiện theo hướng dẫn trong tệp <code className="bg-slate-200 px-1 py-0.5 rounded">README.md</code> để tạo và cấu hình một dự án Firebase.
                    </li>
                    <li>
                        Đảm bảo bạn đã kích hoạt **Authentication (Email/Password)** và **Firestore**.
                    </li>
                    <li>
                        Sao chép đối tượng cấu hình dự án của bạn từ bảng điều khiển Firebase.
                    </li>
                    <li>
                        Dán cấu hình vào tệp <code className="bg-slate-200 px-1 py-0.5 rounded">services/firebase.ts</code>, thay thế các giá trị giữ chỗ.
                    </li>
                </ol>
            </div>
             <p className="mt-6 text-center text-sm text-slate-500">
                Sau khi cập nhật cấu hình, vui lòng tải lại trang này.
            </p>
        </Card>
    </div>
);

const App: React.FC = () => {
    const { user, loading } = useAuth();

    if (!isFirebaseConfigured()) {
        return <FirebaseConfigWarning />;
    }
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <i className="fas fa-spinner fa-spin text-4xl text-blue-600"></i>
            </div>
        );
    }

    return (
        <AuthContext.Provider value={{ user, loading }}>
            <Toaster position="top-center" reverseOrder={false} />
            <HashRouter>
                {!user ? (
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="*" element={<Navigate to="/login" />} />
                    </Routes>
                ) : (
                    <UserDataProvider>
                        <Layout>
                            <Routes>
                                <Route path="/dashboard" element={<Dashboard />} />
                                <Route path="/manage" element={<ManagementPage />} />
                                <Route path="/assets" element={<AssetsPage />} />
                                <Route path="/couple" element={<CouplePage />} />
                                <Route path="*" element={<Navigate to="/dashboard" />} />
                            </Routes>
                        </Layout>
                    </UserDataProvider>
                )}
            </HashRouter>
        </AuthContext.Provider>
    );
};

export default App;
