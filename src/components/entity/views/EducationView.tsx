import React from 'react';
import {
  GraduationCap,
  Calendar,
  ShieldCheck,
  Info,
  ChevronRight,
  ArrowUpRight,
  Award,
  History,
  Library,
  Fingerprint,
} from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { buildPath } from '@/lib/utils/paths';
import { getOptimizedImageUrl } from '@/lib/utils/image';

const EMPTY_CLAIMS: Claim[] = [];

interface EducationProps {
  entity: Entity;
  claims: Claim[];
}

export function EducationView({
  entity,
  claims = EMPTY_CLAIMS,
}: EducationProps) {
  // Basic entity data
  const nombre = entity.label || 'Institución Educativa';
  const alias = entity.aliases?.[0] || '';

  // Institución type
  const instanceClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return prop.includes('instancia') || prop.includes('tipo');
  });
  const tipo = instanceClaim?.value_relation?.label || 'Institución Educativa';

  const idRegistro = entity.$id;

  const fechaCreacion = entity.$createdAt
    ? new Date(entity.$createdAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/D';

  const fechaModificacion = entity.$updatedAt
    ? new Date(entity.$updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'N/D';

  // Logo / Image
  const logoClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('logo') ||
      prop.includes('imagen') ||
      prop.includes('escudo')
    );
  });
  const logoUrl = logoClaim?.value_raw;

  // Vinculos (Claims that connect to this institution)
  // For now we will map over some of the claims to show connections
  const vinculos = claims
    .filter((c) => {
      const prop = c.property?.label?.toLowerCase() || '';
      return (
        !prop.includes('instancia') &&
        !prop.includes('logo') &&
        (c.value_relation || c.subject?.$id !== entity.$id)
      );
    })
    .map((c) => {
      const isIncoming =
        typeof c.value_relation === 'object' &&
        c.value_relation?.$id === entity.$id;
      const relatedEntity = isIncoming ? c.subject : c.value_relation;

      const relacion = c.property?.label || 'Vínculo';
      let detalle = c.value_raw || '';
      let fechaFin = '';

      // Try to find a qualifier for date
      if (c.qualifiers && c.qualifiers.length > 0) {
        const dateQ = c.qualifiers.find((q) => {
          const p = q.property?.label?.toLowerCase() || '';
          return p.includes('fecha') || p.includes('fin');
        });
        if (dateQ) fechaFin = dateQ.value_raw || '';

        const detailQ = c.qualifiers.find((q) => {
          const p = q.property?.label?.toLowerCase() || '';
          return (
            p.includes('titulo') ||
            p.includes('título') ||
            p.includes('carrera') ||
            p.includes('grado')
          );
        });
        if (detailQ && !detalle) detalle = detailQ.value_raw || '';
      }

      return {
        entidad: relatedEntity?.label || 'Entidad Desconocida',
        relacion: relacion,
        detalle: detalle,
        fechaFin: fechaFin,
        link: relatedEntity?.$id
          ? buildPath(`/entity?id=${relatedEntity.$id}`)
          : '#',
        esPersona:
          typeof relatedEntity?.label === 'string' &&
          relatedEntity.label.includes(' '), // check if label contains space (naive heuristic for person names)
      };
    });

  return (
    <main className="min-h-screen bg-neutral-white text-primary-green font-sans antialiased pb-24">
      <section className="bg-primary-green pt-32 pb-24 px-6 relative overflow-hidden text-center">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center">
          <div className="mb-10 relative group">
            <div className="w-44 h-44 bg-white rounded-full flex items-center justify-center shadow-2xl p-4 border-4 border-hunter/20 overflow-hidden relative">
              {logoUrl ? (
                <img
                  src={getOptimizedImageUrl(logoUrl, 600)}
                  alt={`Escudo oficial ${nombre}`}
                  width={600}
                  height={600}
                  className="w-full h-full object-contain drop-shadow-sm relative z-10"
                />
              ) : (
                <GraduationCap className="w-20 h-20 text-primary-green/20 relative z-10" />
              )}
            </div>
            <div
              className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl ring-4 ring-primary-green"
              title="Institución Verificada"
            >
              <ShieldCheck size={20} strokeWidth={3} />
            </div>
          </div>

          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-hunter animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hunter">
                {tipo}
              </span>
            </div>
            <h1
              className="text-6xl md:text-8xl font-black text-hunter tracking-tighter leading-[0.85] mb-6"
              style={{ textWrap: 'balance' }}
            >
              {nombre}
            </h1>
            {alias && (
              <div className="flex justify-center items-center gap-4 text-2xl font-bold text-hunter/70 italic">
                <span>{alias}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-12 rounded-[4rem] shadow-xl border border-primary-green/5 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-12">
              <div className="p-4 bg-primary-green text-hunter rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">
                  Vínculos Institucionales
                </h3>
                <p className="text-[10px] font-bold opacity-70 uppercase tracking-[0.3em]">
                  Conexiones detectadas en el sistema
                </p>
              </div>
            </div>

            {vinculos.length > 0 ? (
              <div className="space-y-4">
                {vinculos.map((v) => (
                  <a
                    key={`${v.entidad}-${v.relacion}-${v.detalle}-${v.fechaFin}`}
                    href={v.link || '#'}
                    className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-primary-green/5 rounded-[3rem] border border-transparent hover:border-primary-green hover:bg-white transition-all"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-primary-green shadow-sm group-hover:bg-hunter transition-colors">
                        {v.esPersona ||
                        v.relacion.toLowerCase().includes('estudi') ? (
                          <GraduationCap size={24} />
                        ) : (
                          <Library size={24} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-black group-hover:text-primary-green">
                          {v.entidad}
                        </h4>
                        <p className="text-[11px] font-bold opacity-70 uppercase tracking-widest mt-1">
                          {v.relacion}{' '}
                          {v.detalle
                            ? `• ${typeof v.detalle === 'string' && v.detalle.length > 30 ? v.detalle.substring(0, 30) + '...' : v.detalle}`
                            : ''}
                        </p>
                      </div>
                    </div>
                    {v.fechaFin && (
                      <div className="mt-4 md:mt-0 flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase opacity-60 text-pretty">
                            Finalización
                          </p>
                          <p className="text-xs font-black">{v.fechaFin}</p>
                        </div>
                        <ChevronRight className="opacity-0 group-hover:opacity-100 transition-opacity translate-x-2" />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-primary-green/5 rounded-[3rem]">
                <p className="text-sm font-bold opacity-70 uppercase tracking-widest">
                  No hay vínculos registrados
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-hunter p-10 rounded-[3.5rem] border border-primary-green/10 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="opacity-70" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] opacity-70">
                  Información del Registro
                </h4>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[9px] font-black opacity-70 uppercase mb-2">
                    Código de Identificación
                  </p>
                  <p className="text-xs font-mono font-bold break-all opacity-80 leading-relaxed">
                    {idRegistro}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-primary-green/5">
                    <Calendar size={16} className="opacity-70" />
                    <div>
                      <p className="text-[9px] font-black opacity-70 uppercase">
                        Fecha de Registro
                      </p>
                      <p className="text-xs font-bold">{fechaCreacion}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/40 rounded-2xl border border-primary-green/5">
                    <History size={16} className="opacity-70" />
                    <div>
                      <p className="text-[9px] font-black opacity-70 uppercase">
                        Última Actualización
                      </p>
                      <p className="text-xs font-bold">{fechaModificacion}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Fingerprint className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.03] group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="bg-primary-green text-hunter p-8 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
            <h4 className="text-2xl font-black tracking-tighter mb-4 relative z-10">
              Explorador Ciudadano
            </h4>
            <p className="text-xs font-medium opacity-80 mb-8 relative z-10 leading-relaxed text-pretty">
              Navega a través de los vínculos académicos registrados para
              descubrir la trayectoria de los actores públicos.
            </p>
            <a
              href={buildPath('/search')}
              className="flex items-center justify-between w-full py-5 px-8 bg-hunter text-primary-green rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              Ir al Buscador
              <ArrowUpRight size={14} />
            </a>
          </div>
        </aside>
      </div>
      <style>{`
                main {
                    -webkit-font-smoothing: antialiased;
                    text-rendering: optimizeLegibility;
                }
            `}</style>
    </main>
  );
}
