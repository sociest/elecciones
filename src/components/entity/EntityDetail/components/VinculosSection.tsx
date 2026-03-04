import React from 'react';
import { BarChart3, ExternalLink, ChevronRight } from 'lucide-react';
import type { LinkItem } from '../types';

interface VinculosSectionProps {
  vinculosItems: LinkItem[];
}

export const VinculosSection: React.FC<VinculosSectionProps> = ({
  vinculosItems,
}) => {
  return (
    <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-200">
      <div className="flex items-center gap-4 mb-10">
        <div className="p-4 bg-green-50 rounded-2xl text-green-600">
          <BarChart3 size={24} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-900 tracking-tight">
            Ecosistema de Datos
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Referencias y menciones detectadas en el grafo
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {vinculosItems.length > 0 ? (
          vinculosItems.slice(0, 10).map((item) => (
            <div
              key={item.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-6 rounded-[2rem] bg-slate-50 border border-slate-100 hover:border-slate-300 transition-all gap-4"
            >
              <div className="flex items-center gap-4">
                <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[8px] font-black uppercase tracking-widest">
                  {item.tipo}
                </span>
                <p className="text-sm font-bold text-slate-800">
                  {item.link ? (
                    <a
                      href={item.link}
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      {item.detalle}
                      <ExternalLink size={10} className="text-slate-400" />
                    </a>
                  ) : (
                    item.detalle
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 text-slate-400 italic text-[10px] font-bold uppercase tracking-tighter">
                <span>{item.relacion || 'Relación'}</span>
                <ChevronRight size={12} />
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 font-bold text-sm">
            No se encontraron otros vínculos.
          </div>
        )}
      </div>
    </div>
  );
};
