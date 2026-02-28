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
        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
          isSelected
            ? 'bg-primary-green border-2 border-primary-green text-hunter shadow-md scale-[1.02]'
            : 'bg-primary-green/5 border-2 border-transparent text-primary-green hover:bg-primary-green/10 hover:border-primary-green/20'
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
