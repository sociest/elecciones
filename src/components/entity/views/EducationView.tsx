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
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden text-center">
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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                {tipo}
              </span>
            </div>
            <h1
              className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] mb-6"
              style={{ textWrap: 'balance' }}
            >
              {nombre}
            </h1>
            {alias && (
              <div className="flex justify-center items-center gap-4 text-2xl font-bold text-slate-400 italic">
                <span>{alias}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-200 relative overflow-hidden">
            <div className="flex items-center gap-4 mb-12">
              <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl">
                <Award size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight text-slate-800">
                  Vínculos Institucionales
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
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
                    className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50 rounded-[3rem] border border-slate-200/50 hover:border-slate-300 transition-all hover:shadow-sm hover:bg-white"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm group-hover:rotate-3 transition-transform">
                        {v.esPersona ||
                        v.relacion.toLowerCase().includes('estudi') ? (
                          <GraduationCap size={24} />
                        ) : (
                          <Library size={24} />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xl font-black text-slate-800 group-hover:text-primary-green transition-colors">
                          {v.entidad}
                        </h4>
                        <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">
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
                          <p className="text-[9px] font-black uppercase text-slate-400 text-pretty">
                            Finalización
                          </p>
                          <p className="text-xs font-black text-slate-700">
                            {v.fechaFin}
                          </p>
                        </div>
                        <ChevronRight className="text-slate-400 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0 group-hover:text-primary-green" />
                      </div>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">
                  No hay vínculos registrados
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Información del Registro
                </h4>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">
                    Código de Identificación
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-slate-300 leading-relaxed">
                    {idRegistro}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <Calendar size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Fecha de Registro
                      </p>
                      <p className="text-xs font-bold text-slate-200">
                        {fechaCreacion}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                    <History size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase">
                        Última Actualización
                      </p>
                      <p className="text-xs font-bold text-slate-200">
                        {fechaModificacion}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <Fingerprint className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 text-slate-400 group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-[3.5rem] shadow-sm relative overflow-hidden group">
            <h4 className="text-2xl font-black tracking-tighter text-slate-800 mb-4 relative z-10">
              Explorador Ciudadano
            </h4>
            <p className="text-xs font-medium text-slate-500 mb-8 relative z-10 leading-relaxed text-pretty">
              Navega a través de los vínculos académicos registrados para
              descubrir la trayectoria de los actores públicos.
            </p>
            <a
              href={buildPath('/search')}
              className="flex items-center justify-between w-full py-5 px-8 bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-800 hover:text-white hover:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-sm"
            >
              Ir al Buscador
              <ArrowUpRight
                size={14}
                className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
              />
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
