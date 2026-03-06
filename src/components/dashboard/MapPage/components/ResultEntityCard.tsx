import React, { memo } from 'react';
import { ChevronRight } from 'lucide-react';
import { buildPath } from '../../../../lib/utils/paths';
import type { Entity } from '../../../../lib/queries';

const ResultEntityCard = memo(
  ({
    entity,
    isSelected,
  }: {
    entity: Entity;
    isSelected: boolean;
    onSelect: () => void;
  }) => (
    <div
      role="button"
      tabIndex={0}
      onClick={() =>
        (window.location.href = buildPath(`/entity?id=${entity.$id}`))
      }
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.location.href = buildPath(`/entity?id=${entity.$id}`);
        }
      }}
      className={`bg-white border p-4 rounded-2xl cursor-pointer transition-all hover:shadow-lg w-full text-left ${
        isSelected
          ? 'border-primary-green shadow-md ring-1 ring-primary-green/20'
          : 'border-slate-200 hover:border-primary-green/50 hover:bg-slate-50'
      }`}
    >
      <h4 className="font-bold text-slate-900 text-sm mb-1 leading-tight line-clamp-2">
        {entity.label || 'Sin nombre'}
      </h4>
      {entity.description && (
        <p className="text-xs text-slate-500 mb-3 line-clamp-2 leading-relaxed">
          {entity.description}
        </p>
      )}
      <a
        href={buildPath(`/entity?id=${entity.$id}`)}
        onClick={(e) => e.stopPropagation()}
        className="text-xs font-bold text-primary-green hover:text-orange-700 flex items-center gap-1 w-max px-3 py-1.5 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
      >
        Ver más
        <ChevronRight size={12} />
      </a>
    </div>
  )
);
ResultEntityCard.displayName = 'ResultEntityCard';

export default ResultEntityCard;
