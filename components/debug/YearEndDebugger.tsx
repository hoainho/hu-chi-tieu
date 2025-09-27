import React, { useState } from 'react';
import YearEndSummary from '../dashboard/YearEndSummary';

const YearEndDebugger: React.FC = () => {
  const [showYearEnd, setShowYearEnd] = useState(false);

  // Override Date to simulate January 1st
  const simulateNewYear = () => {
    const originalDate = Date;
    
    // Mock Date constructor to return January 1st
    (global as any).Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(2024, 0, 1); // January 1st, 2024
        } else {
          super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
      }
      
      static now() {
        return new originalDate(2024, 0, 1).getTime();
      }
    };
    
    setShowYearEnd(true);
    
    // Restore original Date after 10 seconds
    setTimeout(() => {
      (global as any).Date = originalDate;
      setShowYearEnd(false);
    }, 10000);
  };


  return (
    <div className="space-y-4">
      {/* Debug Controls */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-3">🧪 Year-End Summary Debugger</h3>
        <p className="text-sm text-yellow-700 mb-3">
          YearEndSummary CHỈ hiển thị vào ngày 01/01 mỗi năm. Click button để test:
        </p>
        <div className="flex gap-3">
          <button
            onClick={simulateNewYear}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            disabled={showYearEnd}
          >
            🎉 Simulate Jan 1st (New Year)
          </button>
        </div>
        {showYearEnd && (
          <div className="mt-3 text-sm text-yellow-700">
            ⏰ Simulating special date for 10 seconds...
          </div>
        )}
      </div>

      {/* Year-End Summary Component */}
      {showYearEnd && <YearEndSummary />}
    </div>
  );
};

export default YearEndDebugger;
