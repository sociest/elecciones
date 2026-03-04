import React from 'react';
import { Fingerprint, ExternalLink } from 'lucide-react';
import { buildPath } from '../../../../lib/utils/paths';
import { getOptimizedImageUrl } from '../../../../lib/utils/image';

interface PartyCardProps {
  mainParty: {
    id: string | null;
    nombre: string;
    sigla: string;
    rol: string;
    logo: string | null | undefined;
  } | null;
}

export const PartyCard: React.FC<PartyCardProps> = ({ mainParty }) => {
  return (
    <div className="bg-slate-900 p-8 rounded-[3.5rem] shadow-xl border border-slate-800 relative overflow-hidden group">
      <Fingerprint className="absolute -right-12 -bottom-12 w-48 h-48 opacity-5 text-slate-400 group-hover:scale-110 transition-transform duration-1000" />
      <div className="relative z-10">
        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-10 text-center">
          Filiación Partidaria
        </p>

        {mainParty ? (
          <>
            <div className="bg-slate-800 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700 text-center mb-8">
              <div className="w-24 h-24 bg-white rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-md overflow-hidden">
                {mainParty.logo ? (
                  <img
                    src={getOptimizedImageUrl(mainParty.logo, 200)}
                    alt={`Logo de ${mainParty.nombre}`}
                    width={200}
                    height={200}
                    className="w-full h-full object-contain p-4"
                  />
                ) : (
                  <span className="text-slate-900 font-black text-4xl leading-none">
                    {mainParty.sigla}
                  </span>
                )}
              </div>
              <h4 className="font-black text-white text-xl leading-tight mb-3">
                {mainParty.nombre}
              </h4>
              <div className="inline-block bg-slate-700 text-slate-300 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg">
                {mainParty.rol}
              </div>
            </div>
            <a
              href={
                mainParty.id ? buildPath(`/entity?id=${mainParty.id}`) : '#'
              }
              className="flex items-center justify-center gap-3 w-full py-5 bg-green-600 text-white hover:bg-green-500 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-black/20"
            >
              Explorar Partido <ExternalLink size={14} />
            </a>
          </>
        ) : (
          <div className="text-center text-slate-400 py-8 text-xs font-bold">
            No se encontró afiliación registrada.
          </div>
        )}
      </div>
    </div>
  );
};
