import React, { useEffect, useState, Suspense, lazy, useReducer } from 'react';
import {
  Users,
  Navigation,
  ArrowUpRight,
  Globe,
  UserCheck,
  Database,
  Activity,
  Landmark,
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
    <div className="min-h-screen bg-neutral-white text-primary-green antialiased pb-24">
      <style>{`.slide-up{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
      <section className="bg-primary-green pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10 transition-all duration-1000 slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 backdrop-blur-md">
                <span className="w-2 h-2 rounded-full bg-hunter animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-hunter">
                  {categoria}
                </span>
              </div>
              <h1 className="text-5xl md:text-8xl font-black text-hunter tracking-tighter leading-[0.85] text-balance">
                {nombre}
              </h1>
              <div className="flex items-center gap-4 text-hunter/40 font-bold italic text-xl">
                <span>{alias}</span>
              </div>
            </div>

            <div className="lg:col-span-5 relative group">
              <div className="aspect-square bg-white/5 rounded-[3rem] border border-white/10 backdrop-blur-sm overflow-hidden shadow-2xl relative">
                <div className="absolute inset-0 z-0 w-full h-full">
                  <Suspense
                    fallback={
                      <div className="absolute inset-0 flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-[3rem] border border-white/10 text-hunter/50 font-bold p-8 text-center animate-pulse">
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
                      className="w-full py-4 bg-hunter/20 hover:bg-hunter/90 text-hunter hover:text-primary-green backdrop-blur-md rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl hover:scale-[1.02] transition-all"
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
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.1s' }}
        >
          <div className="p-4 bg-primary-green text-hunter rounded-2xl">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Población Electoral
            </p>
            <p className="text-3xl font-black text-primary-green">
              {poblacionFormat}
            </p>
            <p className="text-[9px] font-bold opacity-70 uppercase leading-none mt-1 text-balance">
              {poblacionNota}
            </p>
          </div>
        </div>

        <div
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <div className="p-4 bg-primary-green/5 rounded-2xl text-primary-green">
            <Activity size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              Código Territorial
            </p>
            <p className="text-3xl font-black">{codigoTerritorial}</p>
            <p className="text-[9px] font-bold opacity-70 uppercase mt-1">
              Identificador OEP
            </p>
          </div>
        </div>

        <div
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 slide-up"
          style={{ animationDelay: '0.3s' }}
        >
          <div className="p-4 bg-primary-green/5 rounded-2xl text-primary-green">
            <Landmark size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70">
              División Política
            </p>
            <p className="text-3xl font-black">
              {loadingRelated
                ? '...'
                : provinces.length > 0
                  ? provinces.length
                  : 'Sin'}{' '}
              Divisiones
            </p>
            <p className="text-[9px] font-bold opacity-70 uppercase mt-1">
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
                <div className="p-3 bg-primary-green text-hunter rounded-xl shadow-lg">
                  <Globe size={20} />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-pretty">
                  Sub-divisiones de {nombre}
                </h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {provinces.slice(0, 11).map((p) => (
                  <a
                    key={p.id}
                    href={buildPath(`/entity?id=${p.id}`)}
                    className="p-4 bg-white border border-primary-green/5 rounded-2xl text-center hover:bg-primary-green hover:text-hunter transition-all group shadow-sm flex items-center justify-center min-h-20"
                  >
                    <p className="text-[11px] font-black uppercase tracking-tighter group-hover:scale-105 transition-transform text-balance">
                      {p.nombre}
                    </p>
                  </a>
                ))}
                {provinces.length > 11 && (
                  <div className="p-4 bg-primary-green/5 rounded-2xl flex items-center justify-center border border-dashed border-primary-green/20 min-h-20">
                    <span className="text-[10px] font-black opacity-70 text-center">
                      + {provinces.length - 11} MÁS
                    </span>
                  </div>
                )}
              </div>
            </section>
          )}

          <section className="space-y-8">
            <div className="flex items-center justify-between border-b border-primary-green/5 pb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-green text-hunter rounded-xl shadow-lg">
                  <UserCheck size={20} />
                </div>
                <h3 className="text-3xl font-black tracking-tight text-pretty">
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
                        className="group bg-white border border-primary-green/5 p-8 rounded-[3rem] hover:border-primary-green hover:shadow-2xl transition-all relative overflow-hidden block"
                      >
                        <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowUpRight size={20} className="text-hunter" />
                        </div>
                        <span className="bg-primary-green/5 group-hover:bg-hunter group-hover:text-primary-green px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest mb-4 inline-block border border-primary-green/10 transition-colors">
                          {c.cargo}
                        </span>
                        <h4 className="text-2xl font-black leading-tight mb-4 group-hover:text-primary-green transition-colors line-clamp-2">
                          {c.nombre}
                        </h4>
                        <div className="flex items-center gap-3 py-2 px-3 bg-primary-green/5 group-hover:bg-white/10 rounded-xl border border-primary-green/5 group-hover:border-transparent w-fit transition-colors">
                          <span className="text-[10px] font-bold text-primary-green/60 group-hover:text-primary-green/70 leading-none">
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
          <div className="bg-hunter p-10 rounded-[3.5rem] border border-primary-green/10 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="opacity-70 text-primary-green" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] opacity-70 text-primary-green text-pretty">
                  Información de Auditoría
                </h4>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black opacity-70 uppercase mb-1 text-primary-green">
                    Identificador de Entidad
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-primary-green opacity-80 leading-relaxed">
                    {idRegistro}
                  </p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/40 rounded-2xl border border-primary-green/5">
                  <div className="shrink-0 mt-0.5 opacity-70 text-primary-green">
                    📅
                  </div>
                  <div>
                    <p className="text-[9px] font-black opacity-70 uppercase text-primary-green">
                      Última Modificación
                    </p>
                    <p className="text-xs font-bold text-primary-green">
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
            <Database className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.03] group-hover:rotate-12 transition-transform duration-700 text-primary-green" />
          </div>

          {geoJsonUrl && (
            <div className="bg-primary-green text-hunter p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
              <h4 className="text-2xl font-black tracking-tighter mb-4 relative z-10 text-balance">
                Cartografía Digital
              </h4>
              <p className="text-xs font-medium opacity-80 mb-8 relative z-10 leading-relaxed text-pretty">
                Accede a los archivos geoespaciales oficiales del {nombre} para
                análisis externo.
              </p>
              <a
                href={geoJsonUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full py-5 px-8 bg-hunter text-primary-green rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl flex items-center justify-between group/btn"
              >
                Descargar GeoJSON
                <FileDown
                  size={14}
                  className="group-hover/btn:translate-y-0.5 transition-transform"
                />
              </a>
              <Landmark className="absolute -right-12 -bottom-12 w-48 h-48 opacity-[0.03] group-hover:scale-110 transition-transform duration-1000" />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
