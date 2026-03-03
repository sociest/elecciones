import React from 'react';
import { MapPin, UserCheck, ExternalLink, User } from 'lucide-react';
import { buildPath } from '../../../../lib/utils/paths';
import type { Claim } from '../../../../lib/queries';
import { normalizeText } from '../utils/formatters';
import { extractLabel } from '../utils/claimHelpers';
import { getOptimizedImageUrl } from '../../../../lib/utils/image';

interface HeroSectionProps {
  entityLabel: string;
  perfil: string;
  lugarNacimiento: string;
  lugarNacimientoId: string | null;
  claims: Claim[];
  mainParty: {
    sigla: string;
    nombre: string;
  } | null;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  entityLabel,
  perfil,
  lugarNacimiento,
  lugarNacimientoId,
  claims,
  mainParty,
}) => {
  return (
    <section className="bg-primary-green pt-32 pb-24 px-6 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />

      <div className="max-w-6xl mx-auto relative z-10">
        <div className="flex flex-col md:flex-row gap-12 items-center md:items-end">
          <div className="relative group">
            <div className="w-56 h-64 bg-hunter rounded-[3.5rem] overflow-hidden shadow-2xl border-4 border-white/10 flex items-center justify-center">
              {(() => {
                const portraitClaim =
                  claims.find((c) => {
                    const prop = normalizeText(extractLabel(c.property));
                    return (
                      c.datatype === 'image' &&
                      (prop.includes('foto') ||
                        prop.includes('imagen') ||
                        prop.includes('retrato') ||
                        prop.includes('perfil'))
                    );
                  }) ||
                  claims.find(
                    (c) =>
                      c.datatype === 'image' &&
                      !normalizeText(extractLabel(c.property)).includes('logo')
                  );

                if (portraitClaim?.value_raw) {
                  return (
                    <img
                      src={getOptimizedImageUrl(portraitClaim.value_raw, 400)}
                      alt={`Retrato oficial de ${entityLabel}`}
                      width={400}
                      height={400}
                      className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                    />
                  );
                }

                return (
                  <div className="w-full h-full bg-linear-to-br from-hunter to-hunter flex flex-col items-center justify-center p-4 text-center group-hover:from-hunter group-hover:to-hunter transition-all duration-500">
                    <div className="w-20 h-20 bg-primary-green/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary-green/20 border-dashed">
                      <User size={36} className="text-primary-green/50" />
                    </div>
                    <span className="text-primary-green font-black text-sm uppercase tracking-widest mb-1">
                      Sin Foto
                    </span>
                    <p className="text-primary-green/40 text-[9px] font-bold uppercase tracking-widest leading-tight">
                      Pendiente de <br />
                      actualización
                    </p>
                    {mainParty && (
                      <div className="absolute top-4 left-4 right-4 flex justify-between px-2">
                        <span className="text-primary-green/20 font-black text-4xl opacity-50 absolute right-2 blur-[1px] -z-10">
                          {mainParty.sigla}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div
              className="absolute -bottom-4 -right-4 bg-emerald-500 text-white p-4 rounded-3xl shadow-xl ring-8 ring-primary-green"
              title="Candidato Verificado"
            >
              <UserCheck size={24} strokeWidth={3} />
            </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-hunter animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hunter">
                {perfil}
              </span>
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-hunter tracking-tighter leading-[0.8] mb-8">
              {entityLabel || 'Sin Nombre'}
            </h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-8">
              <div className="flex items-center gap-3 text-hunter/60 font-bold group cursor-pointer hover:text-hunter transition-colors">
                <MapPin size={20} />
                {lugarNacimientoId ? (
                  <a
                    href={buildPath(`/entity?id=${lugarNacimientoId}`)}
                    className="border-b border-transparent group-hover:border-hunter inline-flex items-center gap-1"
                  >
                    {lugarNacimiento}{' '}
                    <ExternalLink size={12} className="opacity-50" />
                  </a>
                ) : (
                  <span className="border-b border-transparent group-hover:border-hunter">
                    {lugarNacimiento}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
