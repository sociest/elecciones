import React from 'react';
import {
  MapPin,
  ShieldCheck,
  User,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  ChevronDown,
  Briefcase,
  GraduationCap,
  Users,
  BarChart3,
  Search,
} from 'lucide-react';
import type { Entity, Authority } from '../../../lib/queries';
import { getOptimizedImageUrl } from '../../../lib/utils/image';

interface EntityCardProps {
  entity: Entity | Authority;
  municipalityName?: string;
}

const NA = 'No hay información aún';

function SocialLink({
  href,
  icon,
  label,
}: {
  href?: string;
  icon: React.ReactNode;
  label: string;
}) {
  if (!href) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        {icon}
        <span className="text-[10px] font-medium">{NA}</span>
      </div>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 text-slate-600 hover:text-primary-green transition-colors"
    >
      {icon}
      <span className="text-[10px] font-medium truncate max-w-[140px]">
        {href}
      </span>
    </a>
  );
}

function TikTokIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.3 6.3 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z" />
    </svg>
  );
}

export const EntityCard: React.FC<EntityCardProps> = ({
  entity,
  municipalityName,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const authority = entity as Authority;
  const hasRole = !!authority.role;
  const hasParty = !!authority.party?.label;
  const social = authority.redesSociales;

  // Multi-value handling
  const displayLocation = municipalityName 
    || (authority.territorioLabels && authority.territorioLabels.length > 0 
        ? authority.territorioLabels.join(' / ') 
        : authority.territorioLabel || 'Bolivia');

  const militanciaParty = authority.militancias && authority.militancias[0];

  return (
    <div 
      onClick={() => setIsExpanded(!isExpanded)}
      className={`group bg-white border border-slate-200/80 rounded-[2rem] hover:border-primary-green/50 hover:shadow-xl hover:shadow-orange-900/5 transition-all overflow-hidden cursor-pointer ${isExpanded ? 'border-primary-green ring-1 ring-primary-green/20 shadow-lg' : ''}`}
    >
      {/* ── CARA VISIBLE ── */}
      <div className="p-8 flex flex-col justify-between min-h-[240px]">
        {/* Top row: role badge + location + shield */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex flex-col gap-1.5">
            {hasRole && (
              <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-tighter w-fit border border-transparent shadow-sm">
                {authority.role}
                {authority.cargos && authority.cargos.length > 1 && ` +${authority.cargos.length - 1}`}
              </span>
            )}
            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin size={12} />
              <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[200px]">
                {displayLocation}
              </span>
            </div>
          </div>
          <div className="bg-emerald-500/10 text-emerald-600 p-2 rounded-full border border-emerald-500/20 shadow-sm">
            <ShieldCheck size={16} strokeWidth={3} />
          </div>
        </div>

        {/* Name + party + photo */}
        <div className="flex gap-4 items-center">
          <div className="flex-1">
            <h4 className="text-3xl font-black leading-[0.85] tracking-tighter text-slate-900 mb-3 group-hover:text-primary-green transition-all flex items-center gap-2">
              <span className="flex-1">{entity.label || 'Sin nombre'}</span>
              <a 
                href={`https://www.google.com/search?q=${encodeURIComponent(entity.label || '')}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title={`Buscar "${entity.label}" en Google`}
              >
                <Search size={16} />
              </a>
            </h4>
            
            <div className="flex flex-col gap-2">
              {/* Candidatura Party */}
              {hasParty && (
                <div className="flex items-center gap-3 py-2 px-3 bg-primary-green text-white rounded-2xl border border-transparent shadow-sm w-fit transition-all">
                  <div className="w-5 h-5 bg-white/20 rounded-md flex items-center justify-center text-[8px] font-black border border-white/30">
                    {authority.party?.label?.substring(0, 3).toUpperCase() || 'POL'}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] uppercase font-black tracking-tighter opacity-70">Postula por</span>
                    <span className="text-[10px] font-bold leading-none">{authority.party?.label}</span>
                  </div>
                </div>
              )}

              {/* Militancia Party */}
              {militanciaParty && militanciaParty !== authority.party?.label && (
                <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 text-slate-600 rounded-2xl border border-slate-200 w-fit transition-all ml-2 opacity-80 group-hover:opacity-100">
                  <div className="w-5 h-5 bg-orange-100 text-[#bf4917] rounded-md flex items-center justify-center text-[8px] font-black border border-orange-200">
                    {militanciaParty.substring(0, 3).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[7px] uppercase font-black tracking-tighter opacity-70 text-slate-400">Milita en</span>
                    <span className="text-[10px] font-bold leading-none">{militanciaParty}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Photo */}
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

        {/* Bottom expand indicator */}
        <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-end">
          <div className="flex items-center gap-1 text-slate-400 group-hover:text-primary-green transition-colors">
            <span className="text-[9px] uppercase font-black tracking-widest hidden sm:block">
              más info
            </span>
            <ChevronDown
              size={14}
              strokeWidth={3}
              className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary-green' : 'group-hover:translate-y-0.5'}`}
            />
          </div>
        </div>
      </div>

      {/* ── EXPANSIÓN ── */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isExpanded ? 'max-h-[1000px]' : 'max-h-0 lg:group-hover:max-h-[1000px]'}`}>
        <div className="px-8 pb-8 border-t border-slate-100 pt-5 flex flex-col gap-6">
          {/* Survey Results (En medio para dar visibilidad) */}
          {authority.results && authority.results.length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-[9px] uppercase font-black text-slate-400 tracking-widest mb-3">
                <BarChart3 size={12} /> Resultados de Encuestas
              </p>
              <div className="flex flex-col gap-3">
                {authority.results.map((res, idx) => (
                  <div key={idx} className="bg-slate-50/50 p-3 rounded-2xl border border-slate-100">
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="text-[11px] font-black text-slate-700 leading-tight">
                        {res.autorLabel}
                      </span>
                      <span className="text-[14px] font-black text-primary-green">
                        {res.porcentaje}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mb-2">
                      <div 
                        className="bg-primary-green h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${res.porcentaje}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                      <span className="uppercase tracking-tighter">Fecha: {res.fechaFin}</span>
                      <span className="italic truncate max-w-[150px]">{res.pregunta}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Trayectoria */}
          {authority.trayectorias && authority.trayectorias.length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2">
                <Briefcase size={12} /> Trayectoria
              </p>
              <div className="flex flex-col gap-1.5">
                {authority.trayectorias.map((item, idx) => (
                  <div key={idx} className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estudios */}
          {authority.estudios && authority.estudios.length > 0 && (
            <div>
              <p className="flex items-center gap-2 text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2">
                <GraduationCap size={12} /> Estudios
              </p>
              <div className="flex flex-col gap-1.5">
                {authority.estudios.map((item, idx) => (
                  <div key={idx} className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Redes sociales */}
          <div>
            <p className="text-[9px] uppercase font-black text-slate-400 tracking-widest mb-2">
              Redes Sociales
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              <SocialLink
                href={social?.facebook}
                icon={<Facebook size={13} />}
                label="Facebook"
              />
              <SocialLink
                href={social?.instagram}
                icon={<Instagram size={13} />}
                label="Instagram"
              />
              <SocialLink
                href={social?.twitter}
                icon={<Twitter size={13} />}
                label="Twitter/X"
              />
              <SocialLink
                href={social?.tiktok}
                icon={<TikTokIcon size={13} />}
                label="TikTok"
              />
              <SocialLink
                href={social?.youtube}
                icon={<Youtube size={13} />}
                label="YouTube"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
