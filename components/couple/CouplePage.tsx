import React, { useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { UserDataContext } from '../../context/UserDataContext';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Button from '../ui/Button';
import { createInvite, getInvite, acceptInvite } from '../../services/firestoreService';

const CouplePage: React.FC = () => {
  const { profile, refreshData } = useContext(UserDataContext);
  const [inviteCode, setInviteCode] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [partnerCode, setPartnerCode] = useState('');

  const handleCreateInvite = async () => {
    if (!profile) return;
    setIsCreatingInvite(true);
    try {
      const code = await createInvite(profile.uid);
      setInviteCode(code);
      toast.success('Đã tạo mã mời! Chia sẻ mã này với đối tác của bạn.');
    } catch (error) {
      toast.error('Không thể tạo mã mời.');
      console.error(error);
    } finally {
      setIsCreatingInvite(false);
    }
  };
  
  const handleJoin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!profile || !partnerCode.trim()) return;
      setIsJoining(true);
      try {
          const inviteDoc = await getInvite(partnerCode.trim());
          if (!inviteDoc.exists()) {
              throw new Error("Mã mời không hợp lệ hoặc đã hết hạn.");
          }
          const fromUserId = inviteDoc.data().fromUserId;
          if (fromUserId === profile.uid) {
              throw new Error("Bạn không thể sử dụng mã mời của chính mình.");
          }

          await acceptInvite(inviteDoc.id, fromUserId, profile.uid);
          toast.success(`Đã liên kết thành công với đối tác!`);
          refreshData(); // Refresh all data to get new couple info
          setPartnerCode('');

      } catch (error: any) {
          toast.error(error.message || 'Không thể tham gia.');
          console.error(error);
      } finally {
          setIsJoining(false);
      }
  }
  
  const handleCopy = (text: string) => {
      navigator.clipboard.writeText(text);
      toast.success("Đã sao chép mã mời!");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Quản lý Đối tác</h1>
      
      {profile?.coupleId ? (
        <Card>
            <div className="text-center">
                 <i className="fas fa-heart text-5xl text-rose-500 mb-4"></i>
                <h2 className="text-2xl font-semibold">Bạn đã được kết nối!</h2>
                <p className="text-slate-600 mt-2">
                    Tài khoản của bạn được liên kết với <span className="font-bold text-slate-800">{profile.partnerName}</span>.
                </p>
                <p className="text-slate-500 mt-4">
                    Bây giờ bạn có thể thêm các giao dịch và tài sản được chia sẻ, chúng sẽ hiển thị cho cả hai bạn.
                </p>
            </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card>
                <h2 className="text-xl font-semibold mb-4">Mời đối tác của bạn</h2>
                <p className="text-slate-600 mb-4">
                    Tạo mã mời duy nhất và chia sẻ mã đó với đối tác của bạn để liên kết tài khoản và quản lý tài chính cùng nhau.
                </p>
                {inviteCode ? (
                    <div className="p-4 bg-slate-100 rounded-lg flex items-center justify-between">
                        <span className="font-mono text-lg font-bold text-slate-700">{inviteCode}</span>
                        <Button onClick={() => handleCopy(inviteCode)}><i className="fas fa-copy mr-2"></i>Sao chép</Button>
                    </div>
                ): (
                    <Button onClick={handleCreateInvite} disabled={isCreatingInvite} className="w-full">
                        {isCreatingInvite ? 'Đang tạo...' : 'Tạo mã mời'}
                    </Button>
                )}
            </Card>
             <Card>
                <h2 className="text-xl font-semibold mb-4">Chấp nhận lời mời</h2>
                <p className="text-slate-600 mb-4">
                    Nếu đối tác của bạn đã gửi cho bạn một mã mời, hãy nhập nó vào đây để liên kết tài khoản của bạn.
                </p>
                <form onSubmit={handleJoin} className="space-y-4">
                    <div>
                        <label htmlFor="partnerCode" className="block text-sm font-medium text-slate-700">Mã mời của đối tác</label>
                        <Input 
                            id="partnerCode"
                            type="text" 
                            value={partnerCode} 
                            onChange={(e) => setPartnerCode(e.target.value)} 
                            placeholder="Nhập mã vào đây"
                            required 
                        />
                    </div>
                    <Button type="submit" disabled={isJoining} className="w-full">
                        {isJoining ? 'Đang liên kết...' : 'Liên kết tài khoản'}
                    </Button>
                </form>
            </Card>
        </div>
      )}
    </div>
  );
};

export default CouplePage;
