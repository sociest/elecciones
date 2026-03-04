import React from 'react';
import { MapPin, Globe, ChevronRight } from 'lucide-react';
import { buildPath } from '../../../../lib/utils/paths';

interface JurisdiccionCardProps {
  lugarNacimiento: string;
}

export const JurisdiccionCard: React.FC<JurisdiccionCardProps> = ({
  lugarNacimiento,
}) => {
  return (
    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <MapPin size={18} className="text-slate-400" />
          <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
            Jurisdicción
          </h4>
        </div>
        <div className="space-y-6">
          <h5 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">
            {lugarNacimiento}
          </h5>
          <p className="text-sm font-medium text-slate-500 text-pretty">
            Área administrativa vinculada a la trayectoria del candidato.
          </p>
          <a
            href={buildPath('/mapa')}
            className="inline-flex items-center gap-3 text-xs font-black uppercase tracking-widest text-green-600 border-b-2 border-green-600/20 hover:border-green-600 transition-all pb-1"
          >
            Ver estadísticas regionales <ChevronRight size={14} />
          </a>
        </div>
      </div>
      <Globe className="absolute -right-10 -bottom-10 w-44 h-44 opacity-5 text-slate-400 group-hover:rotate-12 transition-transform duration-700" />
    </div>
  );
};
