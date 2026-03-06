import React from 'react';
import {
  Users,
  MapPin,
  PieChart,
  ExternalLink,
  Facebook,
  Globe,
  Activity,
} from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { PROPERTY_IDS } from '@/lib/constants/entity-types';

const EMPTY_CLAIMS: Claim[] = [];

interface SurveyProps {
  entity: Entity;
  claims: Claim[];
}

export function SurveyView({ entity, claims = EMPTY_CLAIMS }: SurveyProps) {
  const titulo = entity.label || 'Estudio de Opinión Pública';
  const findClaim = (keyword: string) =>
    claims.find(
      (c) => c.property?.['$id']?.toLowerCase() === keyword.toLowerCase()
    );

  const autorClaim = findClaim(PROPERTY_IDS.AUTOR_ENCUESTA);
  const autor =
    autorClaim?.value_relation?.label ||
    autorClaim?.value_raw ||
    'Autor Desconocido';

  const coberturaClaim = findClaim(PROPERTY_IDS.COBERTURA_ENCUESTA);
  const cobertura =
    coberturaClaim?.value_relation?.label ||
    coberturaClaim?.value_raw ||
    'Nivel Nacional';

  const margenClaim = findClaim(PROPERTY_IDS.MARGEN_ERROR_ENCUESTA);
  const margenError = margenClaim?.value_raw
    ? margenClaim.value_raw.replace(/±|%|\s/g, '')
    : 'N/D';

  const muestraClaim = findClaim(PROPERTY_IDS.MUESTRA_ENCUESTA);
  const muestraTotal = muestraClaim?.value_raw || 'No especificado';

  const masculinoQualifier = muestraClaim?.qualifiers?.find((q) =>
    q.property?.label?.toLowerCase().match(/masculino|hombres/)
  );
  const muestraMasculino = masculinoQualifier?.value_raw || 'N/D';

  const femeninoQualifier = muestraClaim?.qualifiers?.find((q) =>
    q.property?.label?.toLowerCase().match(/femenino|mujeres|femenina/)
  );
  const muestraFemenino = femeninoQualifier?.value_raw || 'N/D';

  const inicioClaim = findClaim(PROPERTY_IDS.FECHA_INICIO_ENCUESTA);
  const fechaInicio = inicioClaim?.value_raw || 'N/D';

  const finClaim = findClaim(PROPERTY_IDS.FECHA_FIN_ENCUESTA);
  const fechaFin = finClaim?.value_raw || 'N/D';

  const generalFechaClaim = findClaim(PROPERTY_IDS.FECHA_PUBLICACION);
  const fInicio =
    fechaInicio !== 'N/D'
      ? fechaInicio
      : generalFechaClaim?.value_raw || 'Desconocida';
  const fFin = fechaFin !== 'N/D' ? fechaFin : fInicio;

  const urlClaim = findClaim(PROPERTY_IDS.ARCHIVO);
  const url = urlClaim?.value_raw;

  let resultados: { nombre: string; porcentaje: number; color: string }[] = [];

  claims.forEach((c) => {
    const prop = c.property?.['$id']?.toLowerCase() || '';
    if (prop !== PROPERTY_IDS.RESULTADO_ENCUESTA) return;
    let pct = NaN;
    let nombre = '';

    //if ((!isNaN(parseFloat(c.value_raw || "")) && parseFloat(c.value_raw || "") > 0 && parseFloat(c.value_raw || "") <= 100)) {
    pct = parseFloat(
      c.value_raw ||
        c.qualifiers?.find((q) =>
          q.property?.label?.toLowerCase().includes('porcentaje')
        )?.value_raw ||
        ''
    );

    if (!isNaN(pct)) {
      nombre =
        c.value_relation?.label ||
        c.qualifiers?.find(
          (q) =>
            q.property?.label?.toLowerCase().includes('candidato') ||
            q.property?.label?.toLowerCase().includes('opcion') ||
            q.property?.label?.toLowerCase().includes('opción')
        )?.value_relation?.label ||
        c.qualifiers?.[0]?.value_relation?.label ||
        c.qualifiers?.[0]?.value_raw ||
        prop;
      if (
        nombre.toLowerCase() === 'resultado' ||
        nombre.toLowerCase() === 'voto' ||
        !nombre
      ) {
        nombre = 'Opción';
      }
      // Avoid duplicating
      if (!resultados.find((r) => r.nombre === nombre)) {
        resultados.push({ nombre, porcentaje: pct, color: '#1e3a2b' });
      }
    }
    //}
  });

  if (resultados.length === 0) {
    resultados = [
      { nombre: 'Esperando resultados...', porcentaje: 0, color: '#94a3b8' },
    ];
  }

  resultados.sort((a, b) => b.porcentaje - a.porcentaje);

  resultados = resultados.map((r, i) => {
    let color = '#1e3a2b';
    if (i === 0 && r.porcentaje > 0) color = '#14281d';
    if (
      r.nombre.toLowerCase().includes('indeciso') ||
      r.nombre.toLowerCase().includes('ninguno') ||
      r.nombre.toLowerCase().includes('blanco') ||
      r.nombre.toLowerCase().includes('nulo')
    ) {
      color = '#94a3b8';
    }
    return { ...r, color };
  });

  const isFemeninoDefined =
    muestraFemenino !== 'N/D' &&
    !isNaN(parseFloat(muestraFemenino.replace(/,/g, '')));
  const isMasculinoDefined =
    muestraMasculino !== 'N/D' &&
    !isNaN(parseFloat(muestraMasculino.replace(/,/g, '')));

  const femNum = isFemeninoDefined
    ? parseFloat(muestraFemenino.replace(/,/g, ''))
    : isMasculinoDefined
      ? 0
      : 50;
  const mascNum = isMasculinoDefined
    ? parseFloat(muestraMasculino.replace(/,/g, ''))
    : isFemeninoDefined
      ? 0
      : 50;
  const totalMuestraParsed = Math.max(femNum + mascNum, 1);

  const femPct =
    isFemeninoDefined || isMasculinoDefined
      ? (femNum / totalMuestraParsed) * 100
      : 50;
  const mascPct =
    isFemeninoDefined || isMasculinoDefined
      ? (mascNum / totalMuestraParsed) * 100
      : 50;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 antialiased pb-24">
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200 mb-8">
            <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Estudio de Opinión Pública
            </span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.95] mb-8 max-w-4xl">
            {titulo}
          </h1>

          <div className="flex flex-wrap justify-center gap-6 text-slate-500 font-bold">
            <div className="flex items-center gap-2">
              <Facebook size={18} />
              <span>{autor}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={18} />
              <span>{cobertura}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-12 grid grid-cols-1 md:grid-cols-4 gap-4 relative z-20">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Muestra Total
          </p>
          <p className="text-3xl font-black text-slate-800">{muestraTotal}</p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
            Ciudadanos
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 text-center border-b-4 border-b-amber-500">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Margen de Error
          </p>
          <p className="text-3xl font-black text-amber-600">
            {margenError !== 'N/D' ? `±${margenError}%` : margenError}
          </p>
          <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">
            Nivel Crítico
          </p>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 text-center">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Lidera Encuesta
          </p>
          <p className="text-xl font-black leading-tight text-slate-800 truncate">
            {resultados[0]?.nombre.split(' ')[0]}...
          </p>
          <p className="text-2xl font-black text-primary-green">
            {resultados[0]?.porcentaje}%
          </p>
        </div>
        <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-800 text-center group">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">
            Período
          </p>
          <p className="text-xs font-black text-slate-200 leading-none mb-1">
            {fInicio}
          </p>
          <p className="text-[9px] font-bold text-slate-500 mb-1 uppercase">
            al
          </p>
          <p className="text-xs font-black text-slate-200 leading-none">
            {fFin}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center justify-between border-b border-slate-200 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl shadow-sm">
                <Activity size={24} />
              </div>
              <h3 className="text-3xl font-black tracking-tight text-slate-800 text-pretty">
                Preferencia de Voto Registrada
              </h3>
            </div>
          </div>

          <div className="space-y-6">
            {resultados.map((r, index) => (
              <div
                key={r.nombre}
                className="group relative bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all"
              >
                <div className="flex justify-between items-end mb-4 px-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-black ${index < 3 ? 'text-primary-green' : 'text-slate-400'}`}
                    >
                      {index < 9 ? `0${index + 1}` : index + 1}
                    </span>
                    <h4 className="text-lg font-black uppercase tracking-tight text-slate-800 group-hover:translate-x-1 transition-transform">
                      {r.nombre}
                    </h4>
                  </div>
                  <span className="text-xl font-black text-primary-green">
                    {r.porcentaje}%
                  </span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200 inset-shadow-sm">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out"
                    style={{
                      width: `${r.porcentaje}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Users size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 text-pretty">
                  Composición de la Muestra
                </h4>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 group-hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Género Femenino
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {muestraFemenino}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${femPct}%` }}
                    ></div>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 group-hover:border-slate-300 transition-all">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[10px] font-black uppercase text-slate-500">
                      Género Masculino
                    </span>
                    <span className="text-lg font-black text-slate-800">
                      {muestraMasculino}
                    </span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-green"
                      style={{ width: `${mascPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            <PieChart className="absolute -right-10 -bottom-10 w-44 h-44 opacity-5 text-slate-400 group-hover:rotate-12 transition-transform duration-700" />
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden group">
            <h4 className="text-2xl font-black tracking-tighter text-slate-800 mb-4 relative z-10">
              Verificación de Fuente
            </h4>
            <p className="text-xs font-medium text-slate-500 mb-8 relative z-10 leading-relaxed text-pretty">
              Este reporte ha sido extraído de la publicación oficial. Consulta
              el archivo original para más detalle de la ficha técnica.
            </p>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between w-full py-5 px-8 bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-slate-800 hover:text-white hover:border-slate-800 active:scale-95 transition-all shadow-sm"
              >
                Ver Archivo Original
                <ExternalLink
                  size={14}
                  className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform"
                />
              </a>
            ) : (
              <div className="flex items-center justify-between w-full py-5 px-8 bg-slate-50 text-slate-400 border border-slate-200 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em]">
                Enlace no disponible
              </div>
            )}
            <Globe className="absolute -right-12 -bottom-12 w-48 h-48 opacity-5 text-slate-400 group-hover:scale-110 transition-transform duration-1000" />
          </div>
        </aside>
      </div>
    </main>
  );
}
