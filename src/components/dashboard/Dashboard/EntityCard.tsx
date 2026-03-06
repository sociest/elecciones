import React from 'react';
import { ArrowUpRight, MapPin, ShieldCheck, User } from 'lucide-react';
import type { Entity, Authority } from '../../../lib/queries';
import { getOptimizedImageUrl } from '../../../lib/utils/image';
import { buildPath } from '../../../lib/utils/paths';

interface EntityCardProps {
  entity: Entity | Authority;
  municipalityName?: string;
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  municipalityName,
}) => {
  const authority = entity as Authority;
  const hasRole = !!authority.role;
  const hasParty = !!authority.party;

  return (
    <a
      href={buildPath(`/entity?id=${entity.$id}`)}
      className="group bg-white border border-slate-200/80 p-8 rounded-[2rem] hover:border-primary-green/50 hover:shadow-xl hover:shadow-orange-900/5 transition-all cursor-pointer relative flex flex-col justify-between min-h-[240px]"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex flex-col gap-1.5">
          {hasRole && (
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter w-fit border border-transparent shadow-sm">
              {authority.role}
            </span>
          )}
          <div className="flex items-center gap-1.5 text-slate-400">
            <MapPin size={12} />
            <span className="text-[10px] font-black uppercase tracking-widest">
              {municipalityName || 'Bolivia'}
            </span>
          </div>
        </div>
        <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-full border border-emerald-500/20 shadow-sm">
          <ShieldCheck size={16} strokeWidth={3} />
        </div>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <h4 className="text-3xl font-black leading-[0.85] tracking-tighter text-slate-900 mb-4 group-hover:text-primary-green group-hover:translate-x-1 transition-all">
            {entity.label || 'Sin nombre'}
          </h4>
          {hasParty && (
            <div className="flex items-center gap-3 py-2.5 px-4 bg-slate-50 rounded-2xl border border-slate-200 w-fit group-hover:bg-primary-green group-hover:text-white transition-colors">
              <div
                className="w-6 h-6 bg-orange-100/50 rounded-lg flex items-center justify-center text-[9px] text-[#bf4917] font-black border border-orange-200 group-hover:bg-white/20 group-hover:text-white group-hover:border-white/30 transition-colors"
                style={
                  authority.party?.color
                    ? {
                        color:
                          authority.party.color !== '#ffffff' &&
                          authority.party.color !== '#f5efea'
                            ? authority.party.color
                            : '#bf4917',
                        borderColor: authority.party.color,
                      }
                    : {}
                }
              >
                {authority.party?.label?.substring(0, 3).toUpperCase() || 'POL'}
              </div>
              <span className="text-[11px] font-bold leading-none text-slate-600 group-hover:text-white">
                {authority.party?.label || 'Partido Desconocido'}
              </span>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 relative w-20 h-24 sm:w-24 sm:h-28 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 flex items-center justify-center shadow-sm -mr-2">
          {authority.imageUrl ? (
            <img
              src={getOptimizedImageUrl(authority.imageUrl, 200)}
              alt={entity.label || 'Candidato'}
              className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
              loading="lazy"
            />
          ) : (
            <div className="flex flex-col items-center gap-1 opacity-60">
              <User size={20} className="text-slate-400" />
              <span className="text-[6px] font-black uppercase text-slate-400 text-center leading-tight">
                En proceso de
                <br />
                actualización
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-5 border-t border-slate-100 flex justify-between items-center">
        <div className="flex gap-6">
          <div>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">
              Preferencia
            </p>
            <p className="text-sm font-black text-slate-700">--%</p>
          </div>
          <div>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-1">
              Propuestas
            </p>
            <p className="text-sm font-black text-slate-700">--</p>
          </div>
        </div>
        <div className="w-10 h-10 bg-primary-green text-white rounded-full flex items-center justify-center translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all shadow-xl">
          <ArrowUpRight size={20} />
        </div>
      </div>
    </a>
  );
};
