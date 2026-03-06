import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';

const DepartmentButton = memo(
  ({
    dept,
    isSelected,
    onSelect,
  }: {
    dept: string;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <button
      onClick={onSelect}
      className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
        isSelected
          ? 'bg-primary-green border-2 border-primary-green text-hunter shadow-md scale-[1.02]'
          : 'bg-slate-50 border-2 border-transparent text-slate-700 hover:bg-white hover:border-slate-200 hover:text-slate-900 shadow-sm'
      }`}
    >
      <div className="flex items-center justify-between">
        <span>{dept}</span>
        {isSelected && <ChevronRight size={16} />}
      </div>
    </button>
  )
);
DepartmentButton.displayName = 'DepartmentButton';

export default DepartmentButton;
