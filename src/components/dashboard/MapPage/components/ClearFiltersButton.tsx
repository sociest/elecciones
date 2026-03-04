import { memo } from 'react';
import { X } from 'lucide-react';

const ClearFiltersButton = memo(({ onClear }: { onClear: () => void }) => (
  <button
    onClick={onClear}
    className="text-xs font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 transition-colors"
  >
    <X size={12} />
    Limpiar filtros
  </button>
));
ClearFiltersButton.displayName = 'ClearFiltersButton';

export default ClearFiltersButton;
