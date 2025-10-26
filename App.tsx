import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import './styles/animations.css';
import { Provider } from 'react-redux';
import { store } from './store';
import Login from './components/auth/Login';
import ManagementPage from './components/management/ManagementPage';
import AssetsPage from './components/assets/AssetsPage';
import EnhancedAssetForm from './components/assets/EnhancedAssetForm';
import InvestmentPage from './components/assets/InvestmentPage';
import EnhancedTransactionForm from './components/transactions/EnhancedTransactionForm';
import EnvelopeManager from './components/envelopes/EnvelopeManager';
import SpendingSourceManager from './components/management/SpendingSourceManager';
import SavingsGoalsPage from './components/savings/SavingsGoalsPage';
import Layout from './components/layout/Layout';
import CouplePage from './components/couple/CouplePage';
import { AuthContext } from './context/AuthContext';
import ReduxUserProvider from './components/providers/ReduxUserProvider';
import AuthDebugger from './components/debug/AuthDebugger';
import { Toaster } from 'react-hot-toast';
import { isFirebaseConfigured, initializeOfflineSupport } from './services/firebase';
import { useAuth } from './hooks/useAuth';
import Card from './components/ui/Card';
import ModernDashboard from './components/dashboard/ModernDashboard';
import ErrorBoundary from './components/error-boundaries/ErrorBoundary';

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
    
    console.log('App - user:', user, 'loading:', loading);

    if (!isFirebaseConfigured()) {
        return <FirebaseConfigWarning />;
    }
    
    // Initialize offline support when user is authenticated
    React.useEffect(() => {
        if (user) {
            initializeOfflineSupport().catch(console.error);
        }
    }, [user]);
    
    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Loading your financial dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <Provider store={store}>
            <AuthDebugger>
                <AuthContext.Provider value={{ user, loading }}>
                    <Toaster position="top-center" reverseOrder={false} />
                    <HashRouter>
                        <ErrorBoundary>
                            {!user ? (
                                <Routes>
                                    <Route path="/login" element={<Login />} />
                                    <Route path="*" element={<Navigate to="/login" />} />
                                </Routes>
                            ) : (
                                <ReduxUserProvider>
                                    <Layout>
                                        <Routes>
                                            <Route path="/dashboard" element={<ModernDashboard />} />
                                            <Route path="/manage" element={<ManagementPage />} />
                                            <Route path="/transactions/new" element={<EnhancedTransactionForm />} />
                                            <Route path="/assets" element={<AssetsPage />} />
                                            <Route path="/assets/new" element={<EnhancedAssetForm />} />
                                            <Route path="/investments" element={<InvestmentPage />} />
                                            <Route path="/envelopes" element={<EnvelopeManager />} />
                                            <Route path="/spending-sources" element={<SpendingSourceManager />} />
                                            <Route path="/savings-goals" element={<SavingsGoalsPage />} />
                                            <Route path="/couple" element={<CouplePage />} />
                                            <Route path="*" element={<Navigate to="/dashboard" />} />
                                        </Routes>
                                    </Layout>
                                </ReduxUserProvider>
                            )}
                        </ErrorBoundary>
                    </HashRouter>
                </AuthContext.Provider>
            </AuthDebugger>
        </Provider>
    );
};

export default App;
