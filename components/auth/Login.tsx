import React, { useState, useEffect } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { createUserProfile } from '../../services/firestoreService';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Floating particles animation
  useEffect(() => {
    const particles = document.querySelectorAll('.floating-particle');
    particles.forEach((particle, index) => {
      const delay = index * 0.5;
      (particle as HTMLElement).style.animationDelay = `${delay}s`;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      toast.error('Vui lòng điền vào tất cả các lĩnh vực.');
      return;
    }
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Đăng nhập thành công!');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(userCredential.user, name);
        toast.success('Tạo tài khoản thành công!');
      }
    } catch (error: any) {
      console.error(error);
      const errorMessage = error.code === 'auth/invalid-credential' 
          ? 'Email hoặc mật khẩu không hợp lệ.'
          : error.message;
      toast.error(`Lỗi: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%239C92AC' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }}></div>
        </div>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="floating-particle absolute w-2 h-2 bg-white rounded-full opacity-20 animate-bounce-subtle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDuration: `${3 + Math.random() * 4}s`,
              animationDelay: `${Math.random() * 2}s`
            }}
          />
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo & Title Section */}
          <div className="text-center mb-8 animate-fade-in">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full blur-xl opacity-30 animate-pulse-gentle"></div>
              <div className="relative bg-gradient-to-r from-pink-500 to-violet-500 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl transform hover:scale-110 transition-all duration-300">
                <i className="fas fa-piggy-bank text-3xl text-white animate-bounce-subtle"></i>
              </div>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent mb-2">
              Hủ Chi Tiêu
            </h1>
            <p className="text-gray-300 text-lg font-medium">Cặp Đôi</p>
            <div className="w-24 h-1 bg-gradient-to-r from-pink-500 to-violet-500 rounded-full mx-auto mt-4"></div>
          </div>

          {/* Form Card */}
          <div className="relative animate-slide-up">
            <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 to-violet-500/20 rounded-2xl blur-xl"></div>
            <div className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-2xl">
              {/* Tab Switcher */}
              <div className="flex mb-8 bg-white/5 rounded-xl p-1">
                <button
                  onClick={() => setIsLogin(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    isLogin
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className="fas fa-sign-in-alt mr-2"></i>
                  Đăng nhập
                </button>
                <button
                  onClick={() => setIsLogin(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-300 ${
                    !isLogin
                      ? 'bg-gradient-to-r from-pink-500 to-violet-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-300 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Đăng ký
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Name Field (Register only) */}
                {!isLogin && (
                  <div className="animate-slide-down">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <i className="fas fa-user mr-2"></i>Tên của bạn
                    </label>
                    <div className={`relative transition-all duration-300 ${focusedField === 'name' ? 'transform scale-105' : ''}`}>
                      <Input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        onFocus={() => setFocusedField('name')}
                        onBlur={() => setFocusedField(null)}
                        required
                        placeholder="Nhập tên của bạn"
                        className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-pink-500 focus:ring-pink-500/50 rounded-xl"
                      />
                      <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 -z-10 transition-opacity duration-300 ${focusedField === 'name' ? 'opacity-100' : 'opacity-0'}`}></div>
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="animate-fade-in animate-stagger-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <i className="fas fa-envelope mr-2"></i>Email
                  </label>
                  <div className={`relative transition-all duration-300 ${focusedField === 'email' ? 'transform scale-105' : ''}`}>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      required
                      autoComplete="email"
                      placeholder="you@example.com"
                      className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-pink-500 focus:ring-pink-500/50 rounded-xl"
                    />
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 -z-10 transition-opacity duration-300 ${focusedField === 'email' ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                </div>

                {/* Password Field */}
                <div className="animate-fade-in animate-stagger-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <i className="fas fa-lock mr-2"></i>Mật khẩu
                  </label>
                  <div className={`relative transition-all duration-300 ${focusedField === 'password' ? 'transform scale-105' : ''}`}>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedField('password')}
                      onBlur={() => setFocusedField(null)}
                      required
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="w-full bg-white/10 border-white/20 text-white placeholder-gray-400 focus:border-pink-500 focus:ring-pink-500/50 rounded-xl pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors duration-200"
                    >
                      <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                    <div className={`absolute inset-0 rounded-xl bg-gradient-to-r from-pink-500/20 to-violet-500/20 -z-10 transition-opacity duration-300 ${focusedField === 'password' ? 'opacity-100' : 'opacity-0'}`}></div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="animate-fade-in animate-stagger-3">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-pink-500 to-violet-500 hover:from-pink-600 hover:to-violet-600 text-white font-semibold py-4 rounded-xl shadow-2xl transform hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                        Đang xử lý...
                      </div>
                    ) : (
                      <div className="flex items-center justify-center">
                        <i className={`fas ${isLogin ? 'fa-sign-in-alt' : 'fa-user-plus'} mr-3`}></i>
                        {isLogin ? 'Đăng nhập ngay' : 'Tạo tài khoản'}
                      </div>
                    )}
                  </Button>
                </div>
              </form>

              {/* Footer */}
              <div className="mt-8 text-center animate-fade-in animate-stagger-4">
                <p className="text-gray-400 text-sm mb-4">
                  {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                </p>
                <button
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-transparent bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text font-semibold hover:from-pink-400 hover:to-violet-400 transition-all duration-300 transform hover:scale-105"
                >
                  {isLogin ? '🚀 Tạo tài khoản mới' : '👋 Đăng nhập ngay'}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Decoration */}
          <div className="text-center mt-8 animate-fade-in animate-stagger-4">
            <div className="flex items-center justify-center space-x-4 text-gray-400">
              <div className="w-8 h-px bg-gradient-to-r from-transparent to-gray-400"></div>
              <i className="fas fa-heart text-pink-500 animate-pulse-gentle"></i>
              <div className="w-8 h-px bg-gradient-to-l from-transparent to-gray-400"></div>
            </div>
            <p className="text-gray-400 text-xs mt-4">Quản lý tài chính thông minh cho cặp đôi</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
