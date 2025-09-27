import React, { useState } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';

const HelpGuide: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('overview');

  const sections = [
    { id: 'overview', title: '🎯 Tổng quan', icon: 'fas fa-home' },
    { id: 'budget', title: '💰 Ngân sách', icon: 'fas fa-envelope' },
    { id: 'expense', title: '📊 Chi tiêu', icon: 'fas fa-shopping-cart' },
    { id: 'connection', title: '🔄 Liên kết', icon: 'fas fa-link' },
    { id: 'tips', title: '💡 Mẹo hay', icon: 'fas fa-lightbulb' }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">
          🎯 Ứng dụng Quản lý Tài chính Cá nhân
        </h2>
        <p className="text-slate-600 text-lg">
          Đơn giản như sử dụng Facebook, hiệu quả như có kế toán riêng!
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 border-blue-200 bg-blue-50">
          <h3 className="font-semibold text-blue-800 mb-2">💰 Ngân sách (Phong bì)</h3>
          <p className="text-blue-600 text-sm">
            Chia tiền vào các "phong bì" theo mục đích: Ăn uống, Đi lại, Giải trí...
          </p>
        </Card>
        
        <Card className="p-4 border-green-200 bg-green-50">
          <h3 className="font-semibold text-green-800 mb-2">📊 Chi tiêu</h3>
          <p className="text-green-600 text-sm">
            Mỗi lần mua gì, ghi vào app → Tiền tự động trừ từ phong bì tương ứng
          </p>
        </Card>
        
        <Card className="p-4 border-purple-200 bg-purple-50">
          <h3 className="font-semibold text-purple-800 mb-2">💎 Tài sản</h3>
          <p className="text-purple-600 text-sm">
            Theo dõi nhà, xe, vàng, cổ phiếu... để biết tổng tài sản hiện có
          </p>
        </Card>
        
        <Card className="p-4 border-orange-200 bg-orange-50">
          <h3 className="font-semibold text-orange-800 mb-2">💵 Thu nhập</h3>
          <p className="text-orange-600 text-sm">
            Ghi nhận lương, thưởng, thu nhập phụ để phân bổ vào các phong bì
          </p>
        </Card>
      </div>
    </div>
  );

  const renderBudget = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">💰 Ngân sách - Phương pháp "Phong bì"</h2>
      
      <Card className="p-6 border-blue-200 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 Ví dụ thực tế:</h3>
        <div className="space-y-2 text-blue-700">
          <p><strong>Thu nhập:</strong> 15.000.000 VND/tháng</p>
          <p><strong>Chia thành các phong bì:</strong></p>
          <ul className="ml-4 space-y-1">
            <li>🏠 Tiền nhà: 5.000.000 VND (33%)</li>
            <li>🍜 Ăn uống: 3.000.000 VND (20%)</li>
            <li>🚗 Đi lại: 2.000.000 VND (13%)</li>
            <li>🎬 Giải trí: 1.500.000 VND (10%)</li>
            <li>💰 Tiết kiệm: 3.500.000 VND (24%)</li>
          </ul>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">📝 Cách tạo ngân sách:</h3>
        <ol className="space-y-3 text-slate-600">
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">1</span>
            <div>
              <strong>Vào mục "Ngân sách"</strong>
              <p className="text-sm">Click vào biểu tượng phong bì trên menu</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">2</span>
            <div>
              <strong>Click "Tạo ngân sách mới"</strong>
              <p className="text-sm">Nhập tên phong bì và số tiền dự kiến</p>
            </div>
          </li>
          <li className="flex items-start">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3 mt-0.5">3</span>
            <div>
              <strong>Lặp lại cho tất cả phong bì</strong>
              <p className="text-sm">Tạo đủ phong bì cho các mục chi tiêu chính</p>
            </div>
          </li>
        </ol>
      </Card>
    </div>
  );

  const renderExpense = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">📊 Chi tiêu - Ghi nhận đơn giản</h2>
      
      <Card className="p-6 border-green-200 bg-green-50">
        <h3 className="text-lg font-semibold text-green-800 mb-3">⚡ Quy trình 30 giây:</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-plus"></i>
            </div>
            <p className="font-semibold">Bước 1</p>
            <p className="text-sm">Click "Thêm chi tiêu"</p>
          </div>
          <div className="text-center">
            <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-edit"></i>
            </div>
            <p className="font-semibold">Bước 2</p>
            <p className="text-sm">Điền số tiền & mô tả</p>
          </div>
          <div className="text-center">
            <div className="bg-green-500 text-white rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-2">
              <i className="fas fa-check"></i>
            </div>
            <p className="font-semibold">Bước 3</p>
            <p className="text-sm">Chọn phong bì & lưu</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">📝 Ví dụ ghi chi tiêu:</h3>
        <div className="bg-slate-50 p-4 rounded-lg">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Số tiền:</span>
              <span className="font-semibold">85.000 VND</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Mô tả:</span>
              <span className="font-semibold">Cơm trưa</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Danh mục:</span>
              <span className="font-semibold">🍜 Ăn uống</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Phong bì:</span>
              <span className="font-semibold">💰 Ăn uống</span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderConnection = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">🔄 Ngân sách và Chi tiêu liên kết như thế nào?</h2>
      
      <Card className="p-6 border-purple-200 bg-purple-50">
        <h3 className="text-lg font-semibold text-purple-800 mb-4">🎯 Mối liên hệ trực tiếp:</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center">1</div>
            <div>
              <p className="font-semibold">Tạo phong bì "Ăn uống" với 3.000.000 VND</p>
              <p className="text-sm text-purple-600">Đây là ngân sách dự kiến cho ăn uống trong tháng</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center">2</div>
            <div>
              <p className="font-semibold">Mỗi lần chi tiêu ăn uống → Chọn phong bì "Ăn uống"</p>
              <p className="text-sm text-purple-600">Ứng dụng tự động trừ tiền từ phong bì này</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center">3</div>
            <div>
              <p className="font-semibold">Theo dõi số dư còn lại trong phong bì</p>
              <p className="text-sm text-purple-600">Biết chính xác còn bao nhiều tiền cho ăn uống</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">📊 Ví dụ thực tế:</h3>
        <div className="bg-slate-50 p-4 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <span>🍜 Phong bì "Ăn uống" ban đầu:</span>
            <span className="font-bold text-green-600">3.000.000 VND</span>
          </div>
          <hr className="border-slate-300" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>21/09 - Cơm trưa:</span>
              <span className="text-red-500">-85.000 VND</span>
            </div>
            <div className="flex justify-between">
              <span>21/09 - Cà phê:</span>
              <span className="text-red-500">-45.000 VND</span>
            </div>
            <div className="flex justify-between">
              <span>22/09 - Cơm tối:</span>
              <span className="text-red-500">-120.000 VND</span>
            </div>
          </div>
          <hr className="border-slate-300" />
          <div className="flex justify-between items-center font-bold">
            <span>Còn lại trong phong bì:</span>
            <span className="text-blue-600">2.750.000 VND</span>
          </div>
          <div className="text-center text-sm text-slate-600">
            Đã dùng 8.3% ngân sách ăn uống trong tháng
          </div>
        </div>
      </Card>
    </div>
  );

  const renderTips = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">💡 Mẹo sử dụng hiệu quả</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-6 border-green-200 bg-green-50">
          <h3 className="text-lg font-semibold text-green-800 mb-3">✅ Nên làm</h3>
          <ul className="space-y-2 text-green-700">
            <li className="flex items-start">
              <i className="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
              <span>Ghi chi tiêu ngay khi mua hàng</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
              <span>Kiểm tra ngân sách mỗi tuần</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
              <span>Bắt đầu với 3-4 phong bì cơ bản</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-check-circle text-green-500 mr-2 mt-1"></i>
              <span>Điều chỉnh ngân sách theo thực tế</span>
            </li>
          </ul>
        </Card>

        <Card className="p-6 border-red-200 bg-red-50">
          <h3 className="text-lg font-semibold text-red-800 mb-3">❌ Tránh làm</h3>
          <ul className="space-y-2 text-red-700">
            <li className="flex items-start">
              <i className="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
              <span>Tạo quá nhiều phong bì ngay từ đầu</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
              <span>Quên ghi chi tiêu nhỏ lẻ</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
              <span>Đặt ngân sách quá chặt không thực tế</span>
            </li>
            <li className="flex items-start">
              <i className="fas fa-times-circle text-red-500 mr-2 mt-1"></i>
              <span>Bỏ qua việc review cuối tháng</span>
            </li>
          </ul>
        </Card>
      </div>

      <Card className="p-6 border-blue-200 bg-blue-50">
        <h3 className="text-lg font-semibold text-blue-800 mb-3">🏆 Quy tắc 50/30/20</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">50%</div>
            <p className="font-semibold">Nhu cầu thiết yếu</p>
            <p className="text-sm text-blue-600">Nhà, ăn, đi lại, hóa đơn</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">30%</div>
            <p className="font-semibold">Mong muốn</p>
            <p className="text-sm text-green-600">Giải trí, mua sắm, du lịch</p>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">20%</div>
            <p className="font-semibold">Tiết kiệm & Đầu tư</p>
            <p className="text-sm text-purple-600">Dự phòng, mua nhà, hưu trí</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'overview': return renderOverview();
      case 'budget': return renderBudget();
      case 'expense': return renderExpense();
      case 'connection': return renderConnection();
      case 'tips': return renderTips();
      default: return renderOverview();
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">📚 Hướng dẫn sử dụng</h1>
        <p className="text-slate-600">Học cách sử dụng ứng dụng trong 5 phút</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Sidebar */}
        <div className="lg:w-1/4">
          <Card className="p-4">
            <nav className="space-y-2">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors flex items-center space-x-3 ${
                    activeSection === section.id
                      ? 'bg-blue-500 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <i className={section.icon}></i>
                  <span>{section.title}</span>
                </button>
              ))}
            </nav>
          </Card>
        </div>

        {/* Content */}
        <div className="lg:w-3/4">
          <Card className="p-6">
            {renderContent()}
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 text-center">
        <Card className="p-6 border-yellow-200 bg-yellow-50">
          <h3 className="text-lg font-semibold text-yellow-800 mb-4">🚀 Sẵn sàng bắt đầu?</h3>
          <div className="flex flex-wrap justify-center gap-4">
            <Button className="bg-blue-500 hover:bg-blue-600 text-white">
              <i className="fas fa-envelope mr-2"></i>
              Tạo ngân sách đầu tiên
            </Button>
            <Button className="bg-green-500 hover:bg-green-600 text-white">
              <i className="fas fa-plus mr-2"></i>
              Ghi chi tiêu đầu tiên
            </Button>
            <Button className="bg-purple-500 hover:bg-purple-600 text-white">
              <i className="fas fa-gem mr-2"></i>
              Thêm tài sản
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default HelpGuide;
