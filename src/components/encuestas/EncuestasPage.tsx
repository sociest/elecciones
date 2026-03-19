import React, { useEffect, useReducer, useState } from 'react';
import { buildPath } from '../../lib/utils/paths';
import {
  Loader2,
  BarChart2,
  Briefcase,
  ChevronRight,
  PieChart,
  Globe,
  ChevronDown,
  LayoutGrid,
  FileText,
  ArrowUpRight,
  Clock,
  TrendingUp,
} from 'lucide-react';
import type { Entity } from '../../lib/queries/types';
import { loadCSV } from '../../lib/utils/csvLoader';

type EstudioMini = {
  $id: string;
  label: string;
  coberturaLabel?: string;
};

type CasaConEstudios = Entity & {
  estudios: EstudioMini[];
};

type State = {
  encuestas: (Entity & { coberturaLabel?: string })[];
  casas: CasaConEstudios[];
  loading: boolean;
};

type Action =
  | { type: 'LOAD_START' }
  | {
    type: 'LOAD_SUCCESS';
    encuestas: (Entity & { coberturaLabel?: string })[];
    casas: CasaConEstudios[];
  }
  | { type: 'LOAD_ERROR' };

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'LOAD_START':
      return { ...state, loading: true };
    case 'LOAD_SUCCESS':
      return {
        encuestas: action.encuestas,
        casas: action.casas,
        loading: false,
      };
    case 'LOAD_ERROR':
      return { ...state, loading: false };
    default:
      return state;
  }
};

// ─── Card expandible de Casa Encuestadora ───────────────────────────────────
function CasaCard({ casa }: { casa: CasaConEstudios }) {
  const [open, setOpen] = useState(false);
  const initials = (casa.label ?? 'CE').substring(0, 2).toUpperCase();
  const hasStudies = casa.estudios.length > 0;

  return (
    <div
      className={`rounded-3xl bg-white border transition-all duration-300 overflow-hidden shadow-sm ${open ? 'border-primary-green/30 shadow-lg shadow-primary-green/5' : 'border-slate-200/60 hover:border-slate-300 hover:shadow-md'}`}
    >
      {/* Header de la card */}
      <button
        className="w-full text-left p-6 flex items-center gap-4 group"
        onClick={() => hasStudies && setOpen((o) => !o)}
        aria-expanded={open}
        style={{ cursor: hasStudies ? 'pointer' : 'default' }}
      >
        {/* Avatar */}
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg shrink-0 transition-all duration-300 shadow-sm ${open ? 'bg-primary-green text-white scale-105' : 'bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-primary-green/10 group-hover:text-primary-green group-hover:border-primary-green/20'}`}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <a
            href={buildPath(`/entity?id=${casa.$id}`)}
            onClick={(e) => e.stopPropagation()}
            className="font-black text-slate-900 text-base leading-tight hover:text-primary-green transition-colors inline-flex items-center gap-1.5 group/link"
          >
            {casa.label || 'Casa Encuestadora'}
            <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover/link:opacity-100 -translate-y-0.5 group-hover/link:translate-y-0 translate-x-0.5 group-hover/link:translate-x-0 transition-all" />
          </a>
          <div className="flex items-center gap-2 mt-1">
            <Globe className="w-3 h-3 text-slate-400" />
            <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">
              Casa Encuestadora Registrada
            </span>
          </div>
        </div>

        {/* Badge + toggle */}
        <div className="flex items-center gap-3 shrink-0">
          {hasStudies ? (
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase transition-colors ${open ? 'bg-primary-green/10 text-primary-green' : 'bg-primary-green/5 text-primary-green/80'}`}
            >
              <FileText className="w-3 h-3" />
              {`${casa.estudios.length} estudio${casa.estudios.length !== 1 ? 's' : ''}`}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-slate-100/80 text-slate-400 border border-slate-200/60">
              <Clock className="w-3 h-3" />
              Pendiente
            </span>
          )}

          {hasStudies && (
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${open ? 'bg-primary-green text-white rotate-180' : 'bg-slate-100 text-slate-500'}`}
            >
              <ChevronDown className="w-4 h-4" />
            </div>
          )}
        </div>
      </button>

      {/* Panel de estudios desplegable */}
      {hasStudies && (
        <div
          className={`transition-all duration-300 ease-in-out overflow-hidden ${open ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
        >
          <div className="px-6 pb-6 pt-0">
            <div className="border-t border-slate-100 pt-5">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                <LayoutGrid className="w-3 h-3" />
                Estudios realizados por esta firma
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {casa.estudios.map((estudio) => (
                  <a
                    key={estudio.$id}
                    href={buildPath(`/entity?id=${estudio.$id}`)}
                    className="group/study flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-primary-green/5 hover:border-primary-green/20 transition-all duration-200"
                  >
                    <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0 group-hover/study:bg-primary-green group-hover/study:border-primary-green transition-all duration-200 shadow-sm">
                      <PieChart className="w-3.5 h-3.5 text-slate-400 group-hover/study:text-white transition-colors" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-800 leading-tight line-clamp-1 group-hover/study:text-primary-green transition-colors">
                        {estudio.label || 'Estudio sin título'}
                      </p>
                      {estudio.coberturaLabel && (
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                          {estudio.coberturaLabel}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover/study:text-primary-green group-hover/study:translate-x-0.5 transition-all shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EncuestasPage() {
  const [{ encuestas, casas, loading }, dispatch] = useReducer(reducer, {
    encuestas: [],
    casas: [],
    loading: true,
  });

  useEffect(() => {
    const fetchData = async () => {
      dispatch({ type: 'LOAD_START' });
      try {
        const rows = await loadCSV('/data/encuestas.csv');
        
        // Group by item (Survey)
        const surveyMap = new Map<string, any>();
        const houseMap = new Map<string, CasaConEstudios>();

        rows.forEach(row => {
          const encId = row.item;
          if (!encId) return;

          if (!surveyMap.has(encId)) {
            surveyMap.set(encId, {
              $id: encId,
              label: row.label,
              description: `Fecha: ${row.fecha_inicio} al ${row.fecha_fin} · Margen: ${row.margen} · Muestra: ${row.muestra}`,
              coberturaLabel: row.coberturaLabel || 'ESTUDIO NACIONAL',
              autorId: row.autor,
              autorLabel: row.autorLabel
            });
          }

          // Also track houses
          const casaId = row.autor;
          if (casaId && !houseMap.has(casaId)) {
            houseMap.set(casaId, {
              $id: casaId,
              label: row.autorLabel,
              type: 'Casa Encuestadora',
              estudios: []
            } as CasaConEstudios);
          }
        });

        const loadedEncuestas = Array.from(surveyMap.values());
        
        // Link surveys to houses
        loadedEncuestas.forEach(enc => {
          const house = houseMap.get(enc.autorId);
          if (house) {
            house.estudios.push({
              $id: enc.$id,
              label: enc.label,
              coberturaLabel: enc.coberturaLabel
            });
          }
        });

        const loadedCasas = Array.from(houseMap.values())
          .sort((a, b) => b.estudios.length - a.estudios.length);

        dispatch({
          type: 'LOAD_SUCCESS',
          encuestas: loadedEncuestas,
          casas: loadedCasas,
        });
      } catch (err) {
        console.error('Error fetching encuestas CSV data', err);
        dispatch({ type: 'LOAD_ERROR' });
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-12 h-12 text-primary-green animate-spin mb-4" />
        <p className="text-slate-600 font-medium">
          Buscando encuestas publicadas...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-24 pt-4">
      {/* Sección Encuestas */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/50 flex items-center justify-center border border-orange-200/50">
            <BarChart2 className="w-6 h-6 text-primary-green" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Estudios Registrados
          </h2>
        </div>

        {encuestas.length === 0 ? (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-200 text-center shadow-sm">
            <p className="text-slate-500 italic">
              No se encontraron encuestas registradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {encuestas.map((encuesta) => (
              <a
                key={encuesta.$id}
                href={buildPath(`/entity?id=${encuesta.$id}`)}
                className="group flex flex-col p-8 rounded-[2rem] bg-white border border-slate-200/80 shadow-sm hover:shadow-xl hover:shadow-orange-900/5 hover:-translate-y-1 hover:border-orange-200 transition-all duration-300"
              >
                <div className="flex items-start justify-between gap-4 mb-6">
                  <div className="w-14 h-14 rounded-2xl bg-orange-50 flex items-center justify-center text-orange-600 shrink-0 group-hover:scale-110 group-hover:bg-primary-green group-hover:text-white transition-all duration-300 shadow-sm">
                    <PieChart className="w-7 h-7" />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center px-3 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase bg-slate-100 text-slate-600 shadow-sm">
                      {encuesta.coberturaLabel || 'ESTUDIO NACIONAL'}
                    </span>
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">
                      Reciente
                    </span>
                  </div>
                </div>

                <div className="mb-8">
                  <h3 className="text-[1.35rem] font-black text-slate-900 leading-tight mb-4 line-clamp-2 group-hover:text-primary-green transition-colors">
                    {encuesta.label || 'Estudio sin título registrado'}
                  </h3>
                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {encuesta.description ||
                      'Consulta los resultados completos, contexto metodológico y gráfica de datos de este estudio.'}
                  </p>
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100 flex items-center justify-between">
                  <div className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-widest transition-all group-hover:bg-primary-green group-hover:border-primary-green group-hover:text-white shadow-sm">
                    Ver Estudio Completo
                  </div>
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary-green transition-all shadow-sm">
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-white group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      {/* Sección Casas Encuestadoras */}
      <section>
        <div className="flex items-center gap-4 mb-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/50 flex items-center justify-center border border-orange-200/50">
            <Briefcase className="w-6 h-6 text-primary-green" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Casas Encuestadoras
          </h2>
        </div>
        {/* Stats banner */}
        {(() => {
          const conEstudios = casas.filter(c => c.estudios.length > 0).length;
          const totalEstudios = casas.reduce((s, c) => s + c.estudios.length, 0);
          return (
            <div className="ml-16 mb-8 mt-2 flex flex-wrap gap-4 items-center">
              <p className="text-sm text-slate-500">
                Haz clic en una firma para ver los estudios registrados.
              </p>
              {totalEstudios > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary-green/8 border border-primary-green/15">
                  <TrendingUp className="w-3.5 h-3.5 text-primary-green" />
                  <span className="text-[11px] font-black text-primary-green uppercase tracking-wider">
                    {conEstudios} firma{conEstudios !== 1 ? 's' : ''} · {totalEstudios} estudio{totalEstudios !== 1 ? 's' : ''} cargados
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {casas.length === 0 ? (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-200 text-center shadow-sm">
            <p className="text-slate-500 italic">
              No se encontraron casas encuestadoras registradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {casas.map((casa) => (
              <CasaCard key={casa.$id} casa={casa} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}


