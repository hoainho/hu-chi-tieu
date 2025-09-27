import React from 'react';
import InvestmentForm from './InvestmentForm';

const InvestmentPage: React.FC = () => {
  const handleSuccess = () => {
    // Refresh data or navigate
    console.log('Investment created successfully!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            <i className="fas fa-chart-line text-blue-600 mr-3"></i>
            Quản lý đầu tư
          </h1>
          <p className="text-gray-600">
            Tạo khoản đầu tư mới và tự động trừ từ nguồn thu nhập của bạn
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Investment Form */}
          <div className="lg:col-span-2">
            <InvestmentForm onSuccess={handleSuccess} />
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                Cách hoạt động
              </h3>
              
              <div className="space-y-4 text-sm text-gray-600">
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-blue-600 font-semibold text-xs">1</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Tạo tài sản đầu tư</div>
                    <div>Hệ thống sẽ tạo tài sản đầu tư trong danh mục của bạn</div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-green-600 font-semibold text-xs">2</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Tạo giao dịch chi tiêu</div>
                    <div>Tự động tạo giao dịch trừ tiền từ nguồn thu nhập đã chọn</div>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <span className="text-purple-600 font-semibold text-xs">3</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-700">Theo dõi hiệu suất</div>
                    <div>Xem giá trị thời gian thực và lợi nhuận/lỗ trong dashboard</div>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <div className="flex items-center text-yellow-800 mb-2">
                  <i className="fas fa-exclamation-triangle mr-2"></i>
                  <span className="font-medium">Lưu ý quan trọng</span>
                </div>
                <div className="text-sm text-yellow-700">
                  Khi tạo đầu tư, hệ thống sẽ tự động trừ tiền từ nguồn thu nhập bạn chọn. 
                  Đảm bảo nguồn thu nhập có đủ số dư.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentPage;
