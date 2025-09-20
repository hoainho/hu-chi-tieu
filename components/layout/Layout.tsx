import React, { useContext, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { UserDataContext } from '../../context/UserDataContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile } = useContext(UserDataContext);
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  const navLinkClasses = 'flex items-center px-4 py-2.5 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors';
  const activeNavLinkClasses = 'bg-blue-600 text-white';

  const sidebarContent = (
      <div className="flex flex-col h-full">
        <div className="p-4 border-b border-slate-700">
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <i className="fas fa-wallet"></i>
                Tài Chính Cặp Đôi
            </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <NavLink to="/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-tachometer-alt w-6"></i>
                <span>Bảng điều khiển</span>
            </NavLink>
            <NavLink to="/manage" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-exchange-alt w-6"></i>
                <span>Giao dịch</span>
            </NavLink>
             <NavLink to="/assets" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-briefcase w-6"></i>
                <span>Tài sản</span>
            </NavLink>
            <NavLink to="/couple" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-user-friends w-6"></i>
                <span>Đối tác</span>
            </NavLink>
        </nav>
        <div className="p-4 mt-auto border-t border-slate-700">
            <p className="text-sm text-slate-400">Đăng nhập với tên</p>
            <p className="font-semibold text-white truncate">{profile?.name || 'User'}</p>
            <button onClick={handleLogout} className="w-full mt-4 text-left flex items-center gap-2 px-4 py-2.5 text-slate-200 rounded-lg hover:bg-slate-700 transition-colors">
                <i className="fas fa-sign-out-alt w-6"></i>
                <span>Đăng xuất</span>
            </button>
        </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-100">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-slate-800 text-white flex-shrink-0">
            {sidebarContent}
        </aside>

        {/* Mobile Sidebar */}
        <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
        <aside className={`fixed top-0 left-0 h-full w-64 bg-slate-800 text-white z-40 transform transition-transform md:hidden ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {sidebarContent}
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white shadow-sm md:hidden p-4 flex justify-between items-center">
                <button onClick={() => setSidebarOpen(true)} className="text-slate-600">
                    <i className="fas fa-bars text-xl"></i>
                </button>
                <h1 className="text-lg font-bold">Hủ Chi Tiêu Cặp Đôi</h1>
                <div></div>
            </header>
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-8">
                {children}
            </main>
        </div>
    </div>
  );
};

export default Layout;
