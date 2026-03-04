import React, { useEffect, useState, Suspense, lazy, useReducer } from 'react';
import {
  Users,
  Navigation,
  ArrowUpRight,
  Globe,
  MapPin,
  Map as MapIcon,
  ExternalLink,
  Target,
  Database,
  Calendar,
  Activity,
  Landmark,
  UserCheck,
  Info,
  FileDown,
} from 'lucide-react';
import type { Entity, Claim } from '../../../lib/queries/types';
import {
  databases,
  COLLECTIONS,
  DATABASE_ID,
  Query,
} from '../../../lib/appwrite';
import { buildPath } from '../../../lib/utils/paths';
import { PaginationControls } from '../../ui/PaginationControls';

const TerritoryMap = lazy(() => import('./TerritoryMap'));

const EMPTY_CLAIMS: Claim[] = [];

import { getAuthoritiesByMunicipalityStreaming } from '../../../lib/queries/authorities';

interface TerritoryProps {
  entity: Entity;
  claims: Claim[];
}

interface Candidate {
  id: string;
  nombre: string;
  cargo: string;
  partido: string;
}

interface Province {
  id: string;
  nombre: string;
}

type TerritoryState = {
  provinces: Province[];
  candidates: Candidate[];
  loadingRelated: boolean;
};

type TerritoryAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_PROVINCES'; payload: Province[] }
  | { type: 'SET_CANDIDATES'; payload: Candidate[] };

const territoryReducer = (
  state: TerritoryState,
  action: TerritoryAction
): TerritoryState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loadingRelated: action.payload };
    case 'SET_PROVINCES':
      return { ...state, provinces: action.payload };
    case 'SET_CANDIDATES':
      return { ...state, candidates: action.payload };
    default:
      return state;
  }
};

export function TerritoryView({
  entity,
  claims = EMPTY_CLAIMS,
}: TerritoryProps) {
  const [territoryState, dispatch] = useReducer(territoryReducer, {
    provinces: [],
    candidates: [],
    loadingRelated: true,
  });

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const { provinces, candidates, loadingRelated } = territoryState;

  const nombre = entity.label || 'Territorio Desconocido';
  const alias = entity.aliases?.[0] || '';
  const idRegistro = entity.$id;

  const instanciaClaim = claims.find((c) =>
    c.property?.label?.toLowerCase().includes('instancia de')
  );
  const categoria =
    instanciaClaim?.value_relation?.label || 'Entidad Territorial';

  const poblacionClaim = claims.find(
    (c) =>
      c.property?.label?.toLowerCase().includes('poblacion') ||
      c.property?.label?.toLowerCase().includes('población')
  );
  const poblacionStr = poblacionClaim?.value_raw || 'N/D';
  const poblacionNum = parseInt(poblacionStr);
  const poblacionFormat = isNaN(poblacionNum)
    ? poblacionStr
    : new Intl.NumberFormat('es-BO').format(poblacionNum);

  let poblacionNota = 'Información demográfica';
  if (poblacionClaim && poblacionClaim.qualifiers) {
    const edadQual = poblacionClaim.qualifiers.find(
      (q) =>
        typeof q.property === 'object' &&
        q.property?.label?.toLowerCase()?.includes('edad')
    );
    if (edadQual) poblacionNota = edadQual.value_raw || poblacionNota;
  }

  const territorialCodeClaim = claims.find((c) => {
    const lbl = (c.property?.label || '').toLowerCase().trim();
    return (
      lbl.includes('codigo territorial') || lbl.includes('código territorial')
    );
  });
  const codigoTerritorial = territorialCodeClaim?.value_raw || 'N/D';

  const geoJsonClaim = claims.find((c) => {
    if (!c.value_raw || typeof c.value_raw !== 'string') return false;
    const val = c.value_raw.toLowerCase();
    // Only accept URLs
    if (!val.startsWith('http') && !val.includes('/storage/')) return false;

    const lbl = (c.property?.label || '').toLowerCase().trim();
    if (lbl === 'territorio' || lbl === 'mapa' || lbl.includes('geojson'))
      return true;
    // Fallback: If it's a URL to the storage bucket
    if (
      val.includes('appwrite.sociest.org/v1/storage/') ||
      val.includes('.geojson')
    ) {
      return true;
    }
    return false;
  });
  const geoJsonUrl = geoJsonClaim?.value_raw;

  console.log('[TerritoryView] Data extraction:', {
    nombre,
    codigoTerritorial,
    geoJsonUrl,
    entityId: entity.$id,
    allClaimsCount: claims.length,
  });

  useEffect(() => {
    const fetchIncomingData = async () => {
      if (!entity.$id) return;

      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        const incomingClaims = await databases.listDocuments(
          DATABASE_ID,
          COLLECTIONS.CLAIMS,
          [Query.equal('value_relation', entity.$id), Query.limit(100)]
        );

        const foundProvinces: Province[] = [];
        const subjectIdsToFetch: string[] = [];

        for (const claim of incomingClaims.documents as unknown as Claim[]) {
          if (claim.subject && typeof claim.subject === 'object') {
            if (
              claim.subject.label?.toLowerCase().includes('provincia') ||
              claim.subject.label?.toLowerCase().includes('municipio') ||
              claim.property?.label?.toLowerCase() === 'parte de'
            ) {
              foundProvinces.push({
                id: claim.subject.$id,
                nombre: (claim.subject.label || '')
                  .replace('Provincia de ', '')
                  .replace('Provincia ', ''),
              });
            }
          } else if (claim.subject && typeof claim.subject === 'string') {
            subjectIdsToFetch.push(claim.subject);
          }
        }

        if (subjectIdsToFetch.length > 0) {
          const uniqueIds = [...new Set(subjectIdsToFetch)];
          const batchSize = 50;
          for (let i = 0; i < uniqueIds.length; i += batchSize) {
            const batch = uniqueIds.slice(i, i + batchSize);
            const cRes = await databases.listDocuments<Entity>(
              DATABASE_ID,
              COLLECTIONS.ENTITIES,
              [Query.equal('$id', batch), Query.limit(batchSize)]
            );
            for (const sub of cRes.documents) {
              if (
                sub.label?.toLowerCase().includes('provincia') ||
                sub.label?.toLowerCase().includes('municipio')
              ) {
                foundProvinces.push({
                  id: sub.$id,
                  nombre: (sub.label || '')
                    .replace('Provincia de ', '')
                    .replace('Provincia ', ''),
                });
              }
            }
          }
        }

        const uniqueProvinces = foundProvinces.reduce((acc, current) => {
          const x = acc.find((item) => item.id === current.id);
          return x ? acc : acc.concat([current]);
        }, [] as Province[]);

        dispatch({ type: 'SET_PROVINCES', payload: uniqueProvinces });

        const newCandidates: Candidate[] = [];
        await getAuthoritiesByMunicipalityStreaming(
          entity.$id,
          (batch, replace) => {
            const updated = replace ? [] : [...newCandidates];
            batch.forEach((a) => {
              if (!updated.some((e) => e.id === a.$id)) {
                updated.push({
                  id: a.$id,
                  nombre: a.label || 'Sin nombre',
                  cargo: a.role || 'Autoridad',
                  partido: a.party?.label || 'Sin partido',
                });
              }
            });
            newCandidates.length = 0;
            updated.forEach((c) => newCandidates.push(c));
            dispatch({ type: 'SET_CANDIDATES', payload: [...newCandidates] });
          }
        );
      } catch (err) {
        console.error('Error fetching incoming data', err);
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    fetchIncomingData();
  }, [entity.$id]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased pb-24">
      <style>{`.slide-up{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 transition-all duration-1000 slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {categoria}
                </span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] text-balance">
                {nombre}
              </h1>
              <div className="flex items-center gap-4 text-slate-400 font-bold italic text-xl">
                <span>{alias}</span>
              </div>
            </div>

            <div className="lg:col-span-5 relative group">
              <div className="aspect-square bg-slate-50 rounded-[3rem] border border-slate-200 overflow-hidden shadow-lg relative">
                <div className="absolute inset-0 z-0 w-full h-full">
                  <Suspense
                    fallback={
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-100/50 backdrop-blur-sm rounded-[3rem] text-slate-500 font-bold p-8 text-center animate-pulse">
                        <p>Cargando Mapa...</p>
                      </div>
                    }
                  >
                    <TerritoryMap
                      geoJsonUrl={geoJsonUrl}
                      codigoTerritorial={codigoTerritorial}
                      entityId={entity.$id}
                    />
                  </Suspense>
                </div>
                {geoJsonUrl && (
                  <div className="absolute bottom-8 left-8 right-8 z-10">
                    <a
                      href={buildPath('/mapa')}
                      className="w-full py-4 bg-slate-900/40 hover:bg-white text-white hover:text-primary-green backdrop-blur-md border border-white/20 hover:border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all"
                    >
                      <Navigation size={16} />
                      Explorar Mapa Completo
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 -mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
        <div
          className="bg-white p-8 rounded-[3rem] shadow-md border border-slate-200/80 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="p-4 bg-slate-100 text-slate-500 rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Población Electoral
            </p>
            <p className="text-3xl font-black text-slate-800">
              {poblacionFormat}
            </p>
            <p className="text-[9px] font-bold text-slate-500 uppercase leading-none mt-1 text-balance">
              {poblacionNota}
            </p>
          </div>
        </div>

        <div
          className="bg-white p-8 rounded-[3rem] shadow-md border border-slate-200/80 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Código Territorial
            </p>
            <p className="text-3xl font-black text-slate-800">{codigoTerritorial}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">
              Identificador OEP
            </p>
          </div>
        </div>

        <div
          className="bg-white p-8 rounded-[3rem] shadow-md border border-slate-200/80 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              División Política
            </p>
            <p className="text-3xl font-black text-slate-800">
              {loadingRelated
                ? '...'
                : provinces.length > 0
                  ? provinces.length
                  : 'Sin'}{' '}
              Divisiones
            </p>
            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">
              Nivel Interno
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div
          className="lg:col-span-8 space-y-12 slide-up"
          style={{ animationDelay: '0.4s' }}
        >
          {provinces.length > 0 && (
            <section className="space-y-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-700 rounded-xl shadow-sm border border-slate-200">
                  <Globe size={20} />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-slate-900 text-pretty">
                  Sub-divisiones de {nombre}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {provinces.slice(0, 11).map((p) => (
                  <a
                    key={p.id}
                    href={buildPath(`/entity?id=${p.id}`)}
                    className="p-4 bg-white border border-slate-200/80 rounded-2xl text-slate-700 text-center hover:bg-slate-50 hover:text-primary-green hover:border-slate-300 transition-all group shadow-sm flex items-center justify-center min-h-20"
                  >
                    <p className="text-[11px] font-black uppercase tracking-tighter group-hover:scale-105 transition-transform text-balance">
                      {p.nombre}
                    </p>
                  </a>
                ))}
                {provinces.length > 11 && (
                  <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-center border border-dashed border-slate-200 min-h-20">
                    <span className="text-[10px] font-black text-slate-400 text-center">
                      + {provinces.length - 11} MÁS
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-slate-200 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-slate-100 text-slate-700 rounded-xl shadow-sm border border-slate-200">
                  <UserCheck size={20} />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-slate-900 text-pretty">
                  Actores en Circunscripción
                </h3>
              </div>
            </div>

            {loadingRelated ? (
              <div className="p-12 text-center opacity-80 font-bold animate-pulse">
                Buscando actores relevantes...
              </div>
            ) : candidates.length === 0 ? (
              <div className="p-12 text-center bg-gray-50 rounded-[3rem] border border-dashed border-gray-200 text-gray-400 font-bold">
                No se encontraron autoridades registradas o candidatos en este
                territorio.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {candidates
                    .slice(
                      (currentPage - 1) * ITEMS_PER_PAGE,
                      currentPage * ITEMS_PER_PAGE
                    )
                    .map((c) => (
                      <a
                        key={c.id}
                        href={buildPath(`/entity?id=${c.id}`)}
                        className="group bg-white border border-slate-200/80 p-8 rounded-[3rem] hover:border-slate-300 hover:shadow-lg transition-all relative overflow-hidden block"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight size={20} className="text-slate-400 group-hover:text-primary-green" />
                        </div>
                        <span className="bg-slate-100 text-slate-500 group-hover:bg-primary-green/10 group-hover:text-primary-green px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 inline-block border border-transparent transition-colors">
                          {c.cargo}
                        </span>
                        <h4 className="text-2xl font-black text-slate-800 leading-tight mb-4 group-hover:text-primary-green transition-colors line-clamp-2">
                          {c.nombre}
                        </h4>
                        <div className="flex items-center gap-3 py-2 px-3 bg-slate-50 group-hover:bg-white rounded-xl border border-slate-200 group-hover:border-slate-200/50 w-fit transition-colors">
                          <span className="text-[10px] font-bold text-slate-500 group-hover:text-slate-700 leading-none">
                            {c.partido}
                          </span>
                        </div>
                      </a>
                    ))}
                </div>
                {candidates.length > ITEMS_PER_PAGE && (
                  <PaginationControls
                    currentPage={currentPage}
                    totalPages={Math.ceil(candidates.length / ITEMS_PER_PAGE)}
                    onPageChange={setCurrentPage}
                  />
                )}
              </>
            )}
          </section>
        </div>

        <aside
          className="lg:col-span-4 space-y-8 slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400 text-pretty">
                  Información de Auditoría
                </h4>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">
                    Identificador de Entidad
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-slate-300 leading-relaxed">
                    {idRegistro}
                  </p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="shrink-0 mt-0.5 text-slate-400">
                    <Calendar size={16} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Última Modificación
                    </p>
                    <p className="text-xs font-bold text-slate-200">
                      {entity.$updatedAt
                        ? new Date(entity.$updatedAt).toLocaleDateString(
                          'es-BO',
                          {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          }
                        )
                        : 'N/D'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Database className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:rotate-12 transition-transform duration-700 text-slate-400 group-hover:text-primary-green" />
          </div>

          {geoJsonUrl && (
            <div className="bg-white border border-slate-200/80 p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden group">
              <h4 className="text-2xl font-black tracking-tighter text-slate-800 mb-4 relative z-10 text-balance">
                Cartografía Digital
              </h4>
              <p className="text-xs font-medium text-slate-500 mb-8 relative z-10 leading-relaxed text-pretty">
                Accede a los archivos geoespaciales oficiales del {nombre} para
                análisis externo.
              </p>
              <a
                href={geoJsonUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-5 px-8 bg-slate-100 border border-slate-200 text-slate-700 hover:text-white hover:bg-slate-800 hover:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-sm flex items-center justify-between group/btn"
              >
                Descargar GeoJSON
                <FileDown
                  size={14}
                  className="group-hover/btn:translate-y-0.5 transition-transform"
                />
              </a>
              <Landmark className="absolute -right-12 -bottom-12 w-48 h-48 opacity-5 text-slate-400 group-hover:scale-110 group-hover:text-primary-green transition-all duration-1000" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
