import React, { useState } from 'react';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center">
          <i className="fas fa-wallet text-5xl text-blue-600 mb-4"></i>
          <h1 className="text-2xl font-bold text-slate-800">Hủ Chi Tiêu Cặp Đôi</h1>
          <p className="text-slate-500 mt-2">{isLogin ? 'Đăng nhập vào tài khoản của bạn.' : 'Tạo một tài khoản mới.'}</p>
        </div>
        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {!isLogin && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">Tên</label>
              <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Tên của bạn" />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" placeholder="you@example.com" />
          </div>
          <div>
            <label htmlFor="password"  className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
            <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" placeholder="••••••••" />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <i className="fas fa-spinner fa-spin"></i> : (isLogin ? 'Đăng nhập' : 'Đăng ký')}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-sm font-medium text-blue-600 hover:text-blue-500">
            {isLogin ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </Card>
    </div>
  );
};

export default Login;
