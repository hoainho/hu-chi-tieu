import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAppSelector } from '../../store';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { profile } = useAppSelector(state => state.user);
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
        <div className="p-6 border-b border-slate-700/50">
            <h1 className="text-xl font-bold text-white flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <i className="fas fa-chart-line text-white"></i>
                </div>
                <div>
                    <div className="text-lg">Hủ Tài Chính</div>
                    <div className="text-xs text-slate-400 font-normal">@hoainho edition</div>
                </div>
            </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
            <NavLink to="/dashboard" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-chart-line w-6"></i>
                <span>Bảng điều khiển</span>
            </NavLink>
            <NavLink to="/envelopes" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-envelope w-6"></i>
                <span>Ngân sách</span>
            </NavLink>
            <NavLink to="/manage" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-exchange-alt w-6"></i>
                <span>Giao dịch</span>
            </NavLink>
            <NavLink to="/spending-sources" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-wallet w-6"></i>
                <span>Nguồn Chi Tiêu</span>
            </NavLink>
             <NavLink to="/assets" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-coins w-6"></i>
                <span>Tài sản</span>
            </NavLink>
            <NavLink to="/investments" className={({ isActive }) => `${navLinkClasses} ${isActive ? activeNavLinkClasses : ''}`}>
                <i className="fas fa-chart-line w-6"></i>
                <span>Đầu tư mới</span>
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
    <div className="flex h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Desktop Sidebar */}
        <aside className="hidden md:block w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white flex-shrink-0 shadow-2xl">
            {sidebarContent}
        </aside>

        {/* Mobile Sidebar */}
        <div className={`fixed inset-0 z-30 bg-black bg-opacity-50 transition-opacity md:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
        <aside className={`fixed top-0 left-0 h-full w-64 bg-gradient-to-b from-slate-900 to-slate-800 text-white z-40 transform transition-transform md:hidden shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {sidebarContent}
        </aside>

        <div className="flex-1 flex flex-col overflow-hidden">
            <header className="bg-white/80 backdrop-blur-md shadow-sm md:hidden p-4 flex justify-between items-center border-b border-white/20">
                <button onClick={() => setSidebarOpen(true)} className="text-slate-600 hover:text-slate-800 transition-colors">
                    <i className="fas fa-bars text-xl"></i>
                </button>
                <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Hủ Tài Chính</h1>
                <div></div>
            </header>
            <main className="flex-1 p-6 overflow-x-hidden overflow-y-auto">
                {children}
            </main>
        </div>
    </div>
  );
};

export default Layout;
