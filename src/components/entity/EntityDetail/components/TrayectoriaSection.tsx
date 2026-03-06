import React from 'react';
import {
  History,
  Landmark,
  Calendar,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import { buildPath } from '../../../../lib/utils/paths';
import type { TimelineItem } from '../types';
import { formatDate } from '../utils/formatters';

interface TrayectoriaSectionProps {
  trayectoriaItems: TimelineItem[];
}

export const TrayectoriaSection: React.FC<TrayectoriaSectionProps> = ({
  trayectoriaItems,
}) => {
  return (
    <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-200">
      <div className="flex items-center gap-4 mb-12">
        <div className="p-4 bg-green-600 text-white rounded-2xl">
          <History size={24} />
        </div>
        <div>
          <h3 className="text-3xl font-black text-slate-900 tracking-tight">
            Servicio Público
          </h3>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
            Cargos desempeñados con fechas exactas
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {trayectoriaItems.length > 0 ? (
          trayectoriaItems.map((item) => (
            <div
              key={item.id}
              className="group block p-8 rounded-[3rem] bg-slate-50 border border-slate-200 hover:border-green-500 hover:bg-white hover:shadow-sm transition-all duration-500"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-500 shadow-sm group-hover:bg-green-50 group-hover:text-green-600 transition-colors border border-slate-100">
                    <Landmark size={24} />
                  </div>
                  <div>
                    {(() => {
                      const claimTarget = item.entidad || item.cargo;
                      const link = item.entidadId
                        ? buildPath(`/entity?id=${item.entidadId}`)
                        : null;
                      if (link) {
                        return (
                          <a
                            href={link}
                            className="text-xl font-black text-slate-800 leading-tight mb-1 inline-flex items-center gap-2 hover:underline"
                          >
                            {claimTarget}
                            <ExternalLink
                              size={14}
                              className="text-slate-400"
                            />
                          </a>
                        );
                      }

                      return (
                        <h4 className="text-xl font-black text-slate-800 leading-tight mb-1">
                          {claimTarget}
                        </h4>
                      );
                    })()}
                    <div className="flex items-center gap-2 text-slate-500 font-bold uppercase text-[10px] tracking-widest mt-1">
                      <span>{item.cargo}</span>
                      <ChevronRight size={10} className="text-slate-300" />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200 shadow-sm text-slate-700">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-xs font-black text-slate-800">
                    {item.inicio || item.fin
                      ? `${formatDate(item.inicio || undefined)} — ${formatDate(item.fin || undefined)}`
                      : formatDate(undefined)}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8 text-slate-500 font-medium text-sm">
            No se encontró información de servicio público.
          </div>
        )}
      </div>
    </div>
  );
};
