import React, { useEffect, useReducer } from 'react';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLLECTIONS } from '../../lib/appwrite';
import { buildPath } from '../../lib/utils/paths';
import {
  Loader2,
  BarChart2,
  Briefcase,
  ChevronRight,
  PieChart,
} from 'lucide-react';
import {
  ENTITY_TYPE_IDS,
  PROPERTY_IDS,
} from '../../lib/constants/entity-types';
import type { Entity } from '../../lib/queries/types';

type State = {
  encuestas: Entity[];
  casas: Entity[];
  loading: boolean;
};

type Action =
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; encuestas: Entity[]; casas: Entity[] }
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
        const casasClaims = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CLAIMS,
          [
            Query.equal('property', PROPERTY_IDS.ES_INSTANCIA_DE),
            Query.equal('value_relation', ENTITY_TYPE_IDS.CASA_ENCUESTADORA),
            Query.limit(100),
          ]
        );

        const casaIds = casasClaims.documents
          .map((c) =>
            typeof c.subject === 'string' ? c.subject : c.subject?.$id
          )
          .filter(Boolean);

        let loadedCasas: Entity[] = [];
        if (casaIds.length > 0) {
          const uniqueCasaIds = [...new Set(casaIds)];

          for (let i = 0; i < uniqueCasaIds.length; i += 100) {
            const batch = uniqueCasaIds.slice(i, i + 100);
            const cRes = await databases.listDocuments<Entity>(
              DATABASE_ID,
              COLLECTIONS.ENTITIES,
              [Query.equal('$id', batch), Query.limit(100)]
            );
            loadedCasas = [...loadedCasas, ...cRes.documents];
          }
        }
        const casasResult = loadedCasas;

        const encuestasClaims = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CLAIMS,
          [
            Query.equal('property', PROPERTY_IDS.ES_INSTANCIA_DE),
            Query.equal('value_relation', ENTITY_TYPE_IDS.ENCUESTA_ELECTORAL),
            Query.limit(100),
          ]
        );

        const encuestasIds = encuestasClaims.documents
          .map((c) =>
            typeof c.subject === 'string' ? c.subject : c.subject?.$id
          )
          .filter(Boolean);

        let loadedEncuestas: Entity[] = [];
        if (encuestasIds.length > 0) {
          const uniqueEncuestaIds = [...new Set(encuestasIds)];

          for (let i = 0; i < uniqueEncuestaIds.length; i += 100) {
            const batch = uniqueEncuestaIds.slice(i, i + 100);
            const cRes = await databases.listDocuments<Entity>(
              DATABASE_ID,
              COLLECTIONS.ENTITIES,
              [Query.equal('$id', batch), Query.limit(100)]
            );
            loadedEncuestas = [...loadedEncuestas, ...cRes.documents];
          }
        }
        const encuestasResult = loadedEncuestas;
        dispatch({
          type: 'LOAD_SUCCESS',
          encuestas: encuestasResult,
          casas: casasResult,
        });
      } catch (err) {
        console.error('Error fetching encuestas data', err);
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
      {/* Seccion Encuestas */}
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
                      ESTUDIO NACIONAL
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
                    {encuesta.description || 'Consulta los resultados completos, contexto metodológico y gráfica de datos de este estudio.'}
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

      {/* Seccion Casas Encuestadoras */}
      <section>
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-2xl bg-orange-100/50 flex items-center justify-center border border-orange-200/50">
            <Briefcase className="w-6 h-6 text-primary-green" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">
            Casas Encuestadoras
          </h2>
        </div>

        {casas.length === 0 ? (
          <div className="p-8 rounded-[2rem] bg-white border border-slate-200 text-center shadow-sm">
            <p className="text-slate-500 italic">
              No se encontraron casas encuestadoras registradas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {casas.map((casa) => (
              <a
                key={casa.$id}
                href={buildPath(`/entity?id=${casa.$id}`)}
                className="group flex flex-col p-6 rounded-3xl bg-white border border-slate-200/60 shadow-sm hover:shadow-xl hover:shadow-orange-900/5 hover:-translate-y-1 hover:border-orange-200 transition-all duration-300"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600 font-bold overflow-hidden shadow-sm uppercase group-hover:scale-110 group-hover:bg-primary-green group-hover:text-white group-hover:border-primary-green transition-all duration-300 shrink-0">
                    {casa.label?.substring(0, 2) || 'CA'}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-base leading-tight">
                      {casa.label}
                    </h4>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black">
                      Empresa Autorizada
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:translate-x-1 group-hover:text-primary-green transition-all shrink-0" />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
