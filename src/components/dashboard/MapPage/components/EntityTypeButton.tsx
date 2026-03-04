import React, { memo } from 'react';
import { Globe, Building2, Users, Vote } from 'lucide-react';

const iconMap = {
  Globe,
  Building2,
  Users,
  Vote,
};

const EntityTypeButton = memo(
  ({
    type,
    isSelected,
    onSelect,
  }: {
    type: { value: string; label: string; icon: string };
    isSelected: boolean;
    onSelect: () => void;
  }) => {
    const IconComponent = iconMap[type.icon as keyof typeof iconMap] || null;

    return (
      <button
        onClick={onSelect}
        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${isSelected
            ? 'bg-primary-green border-2 border-primary-green text-hunter shadow-md scale-[1.02]'
            : 'bg-slate-50 border-2 border-transparent text-slate-700 hover:bg-white hover:border-slate-200 hover:text-slate-900 shadow-sm'
          }`}
      >
        <div className="flex items-center gap-3">
          {IconComponent && <IconComponent size={18} />}
          <span>{type.label}</span>
        </div>
      </button>
    );
  }
);
EntityTypeButton.displayName = 'EntityTypeButton';

export default EntityTypeButton;
