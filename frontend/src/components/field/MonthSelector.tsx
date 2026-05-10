import React from 'react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface MonthSelectorProps {
  selectedMonth: number; // 1-12
  onMonthChange: (month: number) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ selectedMonth, onMonthChange }) => {
  return (
    <div className="flex bg-gray-100 rounded-full p-1 overflow-x-auto mx-4 no-scrollbar">
      {MONTHS.map((month, index) => {
        const monthNum = index + 1;
        const isSelected = selectedMonth === monthNum;
        return (
          <button
            key={month}
            onClick={() => onMonthChange(monthNum)}
            className={`px-3 py-1 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
              isSelected 
                ? 'bg-white text-[#5D0623] shadow-sm' 
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            {month}
          </button>
        );
      })}
    </div>
  );
};
