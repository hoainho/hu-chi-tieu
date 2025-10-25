import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '../../store';
import {
  fetchSavingsGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  depositToGoal,
  withdrawFromGoal,
} from '../../store/slices/savingsGoalSlice';
import { fetchSpendingSources, updateBalance } from '../../store/slices/spendingSourceSlice';
import { deductSavingsFromBalance, addSavingsWithdrawal } from '../../store/slices/availableBalanceSlice';
import { SavingsGoal } from '../../types';
import { Timestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import Card from '../ui/Card';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { formatCurrency } from '../../utils/formatters';

const GOAL_CATEGORIES = [
  { value: 'travel', label: '🏖️ Du lịch', icon: '✈️' },
  { value: 'emergency', label: '🆘 Khẩn cấp/Thất nghiệp', icon: '🛡️' },
  { value: 'business', label: '💼 Kinh doanh', icon: '📈' },
  { value: 'education', label: '🎓 Giáo dục', icon: '📚' },
  { value: 'house', label: '🏠 Mua nhà', icon: '🏡' },
  { value: 'other', label: '📦 Khác', icon: '💰' },
];

const SavingsGoalsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.user);
  const { goals, loading } = useAppSelector((state) => state.savingsGoal);
  const { spendingSources } = useAppSelector((state) => state.spendingSource);

  // Form states
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [category, setCategory] = useState<SavingsGoal['category']>('travel');
  const [deadline, setDeadline] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Transaction states
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [transactionAmount, setTransactionAmount] = useState('');
  const [transactionDescription, setTransactionDescription] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  useEffect(() => {
    if (profile?.uid) {
      dispatch(fetchSavingsGoals(profile.uid));
      dispatch(fetchSpendingSources(profile.uid));
    }
  }, [profile?.uid, dispatch]);

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !name || !targetAmount) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    setIsSubmitting(true);
    const newGoal: Omit<SavingsGoal, 'id'> = {
      name,
      description,
      targetAmount: parseFloat(targetAmount),
      currentAmount: 0,
      monthlyContribution: monthlyContribution ? parseFloat(monthlyContribution) : undefined,
      category,
      deadline: deadline ? Timestamp.fromDate(new Date(deadline)) : undefined,
      status: 'active',
      ownerType: 'private',
      ownerId: profile.uid,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    try {
      await dispatch(createGoal(newGoal)).unwrap();
      toast.success(`Đã tạo quỹ "${name}" thành công!`);
      setShowCreateForm(false);
      setName('');
      setDescription('');
      setTargetAmount('');
      setMonthlyContribution('');
      setDeadline('');
      setCategory('travel');
    } catch (error: any) {
      toast.error(error || 'Không thể tạo quỹ tiết kiệm.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !selectedGoal || !transactionAmount || !selectedSource) {
      toast.error('Vui lòng điền đầy đủ thông tin.');
      return;
    }

    const amount = parseFloat(transactionAmount);
    setIsSubmitting(true);

    try {
      if (transactionType === 'deposit') {
        // Deposit to goal and subtract from spending source
        await dispatch(
          depositToGoal({
            goalId: selectedGoal,
            amount,
            description: transactionDescription || `Nạp tiền vào quỹ`,
            spendingSourceId: selectedSource,
            ownerId: profile.uid,
          })
        ).unwrap();

        await dispatch(
          updateBalance({
            spendingSourceId: selectedSource,
            amount,
            operation: 'subtract',
            description: `Nạp vào quỹ tiết kiệm: ${goals.find(g => g.id === selectedGoal)?.name}`,
          })
        );

        // Deduct from available balance (track as savings expense)
        await dispatch(
          deductSavingsFromBalance({
            userId: profile.uid,
            amount,
            description: `Nạp vào quỹ tiết kiệm: ${goals.find(g => g.id === selectedGoal)?.name}`,
            sourceId: selectedGoal,
            coupleId: profile.coupleId,
          })
        );

        toast.success('Đã nạp tiền vào quỹ thành công!');
      } else {
        // Withdraw from goal and add to spending source
        await dispatch(
          withdrawFromGoal({
            goalId: selectedGoal,
            amount,
            description: transactionDescription || `Rút tiền từ quỹ`,
            spendingSourceId: selectedSource,
            ownerId: profile.uid,
          })
        ).unwrap();

        await dispatch(
          updateBalance({
            spendingSourceId: selectedSource,
            amount,
            operation: 'add',
            description: `Rút từ quỹ tiết kiệm: ${goals.find(g => g.id === selectedGoal)?.name}`,
          })
        );

        // Add back to available balance (reverse savings deduction)
        await dispatch(
          addSavingsWithdrawal({
            userId: profile.uid,
            amount,
            description: `Rút từ quỹ tiết kiệm: ${goals.find(g => g.id === selectedGoal)?.name}`,
            sourceId: selectedGoal,
            coupleId: profile.coupleId,
          })
        );

        toast.success('Đã rút tiền từ quỹ thành công!');
      }

      setSelectedGoal(null);
      setTransactionAmount('');
      setTransactionDescription('');
      setSelectedSource('');
    } catch (error: any) {
      toast.error(error || 'Không thể thực hiện giao dịch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string, goalName: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa quỹ "${goalName}"?`)) return;

    try {
      await dispatch(deleteGoal(goalId)).unwrap();
      toast.success('Đã xóa quỹ tiết kiệm.');
    } catch (error: any) {
      toast.error(error || 'Không thể xóa quỹ.');
    }
  };

  const getProgressPercentage = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getCategoryIcon = (cat: SavingsGoal['category']) => {
    return GOAL_CATEGORIES.find((c) => c.value === cat)?.icon || '💰';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">Quỹ Tiết Kiệm Mục Tiêu</h1>
        <p className="mt-2 text-slate-600">
          Tạo và quản lý các quỹ tiết kiệm cho mục tiêu tương lai của bạn
        </p>
      </div>

      {/* Create Goal Button */}
      <div className="mb-6">
        <Button onClick={() => setShowCreateForm(!showCreateForm)} className="bg-green-600 hover:bg-green-700">
          <i className="fas fa-plus mr-2"></i>
          {showCreateForm ? 'Đóng form' : 'Tạo quỹ mới'}
        </Button>
      </div>

      {/* Create Goal Form */}
      {showCreateForm && (
        <Card className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Tạo quỹ tiết kiệm mới</h2>
          <form onSubmit={handleCreateGoal} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Tên quỹ *</label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="VD: Quỹ du lịch Hội An"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Loại quỹ *</label>
                <Select value={category} onChange={(e) => setCategory(e.target.value as SavingsGoal['category'])}>
                  {GOAL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Mô tả</label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả chi tiết về mục tiêu"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Số tiền mục tiêu (VND) *</label>
                <Input
                  type="number"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  placeholder="10000000"
                  required
                  min="1"
                  step="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">Đóng góp hàng tháng (VND)</label>
                <Input
                  type="number"
                  value={monthlyContribution}
                  onChange={(e) => setMonthlyContribution(e.target.value)}
                  placeholder="1000000"
                  min="0"
                  step="1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700">Thời hạn (tùy chọn)</label>
              <Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? 'Đang tạo...' : 'Tạo quỹ tiết kiệm'}
            </Button>
          </form>
        </Card>
      )}

      {/* Goals List */}
      {loading ? (
        <div className="text-center py-8">
          <i className="fas fa-spinner fa-spin text-3xl text-slate-400"></i>
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <i className="fas fa-piggy-bank text-6xl text-slate-300 mb-4"></i>
            <p className="text-slate-500 text-lg">Chưa có quỹ tiết kiệm nào</p>
            <p className="text-slate-400 mt-2">Tạo quỹ đầu tiên để bắt đầu tiết kiệm!</p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((goal) => {
            const progress = getProgressPercentage(goal.currentAmount, goal.targetAmount);
            const isCompleted = goal.status === 'completed';

            return (
              <Card key={goal.id} className={`relative ${isCompleted ? 'border-green-500 border-2' : ''}`}>
                {isCompleted && (
                  <div className="absolute top-2 right-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                    ✓ Hoàn thành
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{getCategoryIcon(goal.category)}</div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">{goal.name}</h3>
                      {goal.description && <p className="text-sm text-slate-500">{goal.description}</p>}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">Tiến độ</span>
                    <span className="font-semibold text-slate-900">{progress.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all ${
                        isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Amounts */}
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hiện tại:</span>
                    <span className="font-semibold text-blue-600">{formatCurrency(goal.currentAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Mục tiêu:</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(goal.targetAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Còn thiếu:</span>
                    <span className="font-semibold text-orange-600">
                      {formatCurrency(Math.max(0, goal.targetAmount - goal.currentAmount))}
                    </span>
                  </div>
                  {goal.monthlyContribution && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Đóng góp/tháng:</span>
                      <span className="text-slate-700">{formatCurrency(goal.monthlyContribution)}</span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setSelectedGoal(goal.id);
                      setTransactionType('deposit');
                    }}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-sm"
                  >
                    <i className="fas fa-plus mr-1"></i>Nạp
                  </Button>
                  <Button
                    onClick={() => {
                      setSelectedGoal(goal.id);
                      setTransactionType('withdraw');
                    }}
                    className="flex-1 bg-orange-600 hover:bg-orange-700 text-sm"
                    disabled={goal.currentAmount === 0}
                  >
                    <i className="fas fa-minus mr-1"></i>Rút
                  </Button>
                  <Button
                    onClick={() => handleDeleteGoal(goal.id, goal.name)}
                    className="bg-red-600 hover:bg-red-700 text-sm px-3"
                  >
                    <i className="fas fa-trash"></i>
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Transaction Modal */}
      {selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {transactionType === 'deposit' ? '💰 Nạp tiền vào quỹ' : '💸 Rút tiền từ quỹ'}
              </h2>
              <button onClick={() => setSelectedGoal(null)} className="text-slate-400 hover:text-slate-600">
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            <form onSubmit={handleTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700">Quỹ</label>
                <Input type="text" value={goals.find((g) => g.id === selectedGoal)?.name} disabled />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Số tiền (VND) *</label>
                <Input
                  type="number"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                  placeholder="1000000"
                  required
                  min="1"
                  step="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">
                  {transactionType === 'deposit' ? 'Nguồn tiền trừ' : 'Nguồn tiền nhận'} *
                </label>
                <Select value={selectedSource} onChange={(e) => setSelectedSource(e.target.value)} required>
                  <option value="">-- Chọn nguồn tiền --</option>
                  {spendingSources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name} ({formatCurrency(source.balance)})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Ghi chú</label>
                <Input
                  type="text"
                  value={transactionDescription}
                  onChange={(e) => setTransactionDescription(e.target.value)}
                  placeholder="Ghi chú về giao dịch"
                />
              </div>

              <div className="flex gap-2">
                <Button type="button" onClick={() => setSelectedGoal(null)} className="flex-1 bg-slate-500">
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 ${
                    transactionType === 'deposit' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'
                  }`}
                >
                  {isSubmitting ? 'Đang xử lý...' : transactionType === 'deposit' ? 'Nạp tiền' : 'Rút tiền'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default SavingsGoalsPage;
