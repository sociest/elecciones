import React, { useCallback, useMemo, useState } from 'react';
import { ListFilter, Users, BarChart3 } from 'lucide-react';
import MapViewWrapper from '../MapViewWrapper/MapViewWrapper';
import { SearchCommand } from '../SearchCommand/SearchCommand';
import { useMunicipalityInitialization } from './hooks/useMunicipalityInitialization';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardState } from './hooks/useDashboardState';
import { buildPath } from '../../../lib/utils/paths';
import { EntityCard } from './EntityCard';
import type { Entity } from '../../../lib/queries';
import { FeaturedPoll } from './components/FeaturedPoll';
import { PaginationControls } from '../../ui/PaginationControls';

const ITEMS_PER_PAGE = 10;

const EntityDashboard: React.FC = () => {
  const {
    userLocation,
    userMunicipalityName,
    municipalityEntityId,
    setUserMunicipalityName,
    setMunicipalityEntityId,
  } = useMunicipalityInitialization();

  /* State for Filters */
  const [selectedFilter, setSelectedFilter] = React.useState<string>('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const resultsRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to results on mobile when filter or municipality changes
  React.useEffect(() => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    if (isMobile && resultsRef.current && (selectedFilter !== 'Todos' || municipalityEntityId)) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedFilter, municipalityEntityId]);

  const { entities, surveys, loading, refreshing } =
    useDashboardData(municipalityEntityId);
  const showLoading = loading || (refreshing && entities.length === 0);

  const { setSelectedMunicipality } = useDashboardState(
    null,
    null,
    userLocation
  );

  const handleMunicipalitySelect = useCallback(
    (municipality: {
      name: string;
      department: string;
      entityId: string;
      hasEntity?: boolean;
    }) => {
      setSelectedMunicipality({
        name: municipality.name,
        department: municipality.department,
      });
      setMunicipalityEntityId(municipality.entityId);
      setUserMunicipalityName(municipality.name);
      setCurrentPage(1);
    },
    [setSelectedMunicipality, setMunicipalityEntityId, setUserMunicipalityName]
  );

  /* Dynamic Cargo Categories */
  const allCargos = useMemo(() => {
    const cargos = new Set<string>();
    entities.forEach((e: any) => {
      // Filter out invalid/empty roles
      if (e.role && e.role !== 'nan' && e.role !== 'undefined') {
        cargos.add(e.role);
      }
    });
    return Array.from(cargos).sort();
  }, [entities]);

  const departamentalCargos = [
    'Gobernador',
    'Vicegobernador',
    'Subgobernador',
    'Asambleístas Departamentales por Territorio',
    'Asambleístas Departamentales por Población'
  ];

  const municipalCargos = [
    'Alcalde',
    'Concejales Municipales'
  ];

  const otherCargos = useMemo(() => {
    const known = [...departamentalCargos, ...municipalCargos];
    // We only want cargos that actually exist in the current entities
    return allCargos.filter(c => !known.includes(c));
  }, [allCargos, departamentalCargos, municipalCargos]);

  /* Filter Logic */
  const filteredEntities = useMemo(() => {
    if (selectedFilter === 'Todos') return entities;

    return entities.filter((entity: Entity & { role?: string }) => {
      const role = entity.role || '';
      
      if (selectedFilter === 'Departamental') {
        return departamentalCargos.includes(role);
      }
      if (selectedFilter === 'Municipal') {
        return municipalCargos.includes(role);
      }
      if (selectedFilter === 'Otros') {
        return otherCargos.includes(role);
      }

      // Specific sub-filter
      return role === selectedFilter || role.includes(selectedFilter);
    });
  }, [entities, selectedFilter, departamentalCargos, municipalCargos, otherCargos]);

  // Pagination Logic
  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntities.length / ITEMS_PER_PAGE)
  );
  const currentEntities = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredEntities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredEntities, currentPage]);

  const FilterButton = ({ label, isActive, onClick, sub }: { label: string, isActive: boolean, onClick: () => void, sub?: boolean }) => (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-xl border transition-all ${
        sub ? 'text-[9px] px-3' : 'text-[10px] px-5'
      } font-black uppercase tracking-widest ${
        isActive
          ? 'bg-primary-green text-white border-primary-green shadow-md z-10'
          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-primary-green hover:border-slate-300 shadow-sm'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-primary-green selection:text-white antialiased">
      {/* MAIN CONTENT */}
      <div className="max-w-7xl mx-auto pt-32 px-6 pb-20">
        <header className="mb-16">
          <div className="max-w-3xl">
            <h1 className="text-5xl md:text-7xl font-black text-slate-900 tracking-[ -0.05em] leading-[0.85] mb-8">
              Conoce a tus <br />
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-green to-orange-400">
                Candidatos.
              </span>
            </h1>

            <div className="relative group">
              <SearchCommand
                onSelect={useCallback((entity: Entity) => {
                  window.location.href = buildPath(`/entity?id=${entity.$id}`);
                }, [])}
                className="w-full"
              />
            </div>

            <div className="mt-8 space-y-6">
              {/* Category Group: Departamental */}
              {departamentalCargos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Departamental</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterButton 
                      label="Departamento" 
                      isActive={selectedFilter === 'Departamental'} 
                      onClick={() => { setSelectedFilter('Departamental'); setCurrentPage(1); }} 
                    />
                    {departamentalCargos.map(cargo => (
                      <FilterButton 
                        key={cargo}
                        label={cargo.replace('Asambleístas Departamentales por ', 'Asambleístas ')} 
                        isActive={selectedFilter === cargo} 
                        onClick={() => { setSelectedFilter(cargo); setCurrentPage(1); }}
                        sub
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Category Group: Municipal */}
              {municipalCargos.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Municipal</span>
                    <div className="h-px flex-1 bg-slate-100"></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <FilterButton 
                      label="Municipio" 
                      isActive={selectedFilter === 'Municipal'} 
                      onClick={() => { setSelectedFilter('Municipal'); setCurrentPage(1); }} 
                    />
                    {municipalCargos.map(cargo => (
                      <FilterButton 
                        key={cargo}
                        label={cargo} 
                        isActive={selectedFilter === cargo} 
                        onClick={() => { setSelectedFilter(cargo); setCurrentPage(1); }}
                        sub
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Others and Global */}
              <div className="flex flex-wrap gap-3 pt-2">
                <FilterButton 
                  label="Todos los Candidatos" 
                  isActive={selectedFilter === 'Todos'} 
                  onClick={() => { setSelectedFilter('Todos'); setCurrentPage(1); }} 
                />
                
                {otherCargos.length > 0 && (
                  <div className="flex items-center gap-4">
                    <FilterButton 
                      label="Otros Cargos" 
                      isActive={selectedFilter === 'Otros'} 
                      onClick={() => { setSelectedFilter('Otros'); setCurrentPage(1); }} 
                    />
                    <div className="flex flex-wrap gap-1">
                      {otherCargos.map(cargo => (
                         <button
                          key={cargo}
                          onClick={() => { setSelectedFilter(cargo); setCurrentPage(1); }}
                          className={`text-[8px] font-black uppercase tracking-tighter px-2 py-1 rounded-lg border ${
                            selectedFilter === cargo 
                              ? 'bg-slate-200 text-slate-800 border-slate-300' 
                              : 'bg-white text-slate-400 border-slate-100 hover:text-primary-green transition-all'
                          }`}
                         >
                           {cargo}
                         </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8 space-y-8 order-2 lg:order-1 min-h-[60rem]">
            <div ref={resultsRef} className="flex items-center justify-between border-b border-slate-200 pb-4">
                <div className="flex items-center gap-2">
                  <Users size={18} className="text-slate-400" />
                  <h2 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">
                  {selectedFilter === 'Todos'
                    ? 'Postulantes en tu región'
                    : `Resultados: ${selectedFilter}`}
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
              {showLoading ? (
                [1, 2, 3, 4].map((_, index) => (
                  <div
                    key={`loading-skeleton-${index}`}
                    className="bg-white border border-slate-200/80 p-6 rounded-[2.5rem] h-60 animate-pulse shadow-sm"
                  >
                    <div className="h-4 w-24 rounded bg-slate-100 mb-4"></div>
                    <div className="h-8 w-3/4 rounded bg-slate-100 mb-3"></div>
                    <div className="h-4 w-1/2 rounded bg-slate-100"></div>
                  </div>
                ))
              ) : currentEntities.length > 0 ? (
                currentEntities.map((entity) => (
                  <EntityCard
                    key={entity.$id}
                    entity={entity}
                    municipalityName={userMunicipalityName || 'Bolivia'}
                  />
                ))
              ) : (
                <div className="col-span-full py-12 text-center text-slate-400 font-medium flex flex-col items-center gap-2 absolute top-0 w-full">
                  <span>
                    No se encontraron resultados para &quot;{selectedFilter}
                    &quot;.
                  </span>
                </div>
              )}
            </div>

            {!showLoading && filteredEntities.length > 0 && (
              <PaginationControls
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={(page) => setCurrentPage(page)}
              />
            )}

            {/* SURVEYS SECTION */}
            {!showLoading && surveys.length > 0 && (
              <div className="pt-12 mt-12 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-8">
                  <BarChart3 size={18} className="text-slate-400" />
                  <h2 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-500">
                    Encuestas Recientes
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {surveys.map((survey: any) => (
                    <a
                      key={survey.$id}
                      href={buildPath(`/entity?id=${survey.$id}`)}
                      className="group bg-white border border-slate-200/80 p-6 rounded-[2.5rem] hover:border-primary-green/50 hover:shadow-xl transition-all"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                          {survey.autorLabel || 'Encuesta'}
                        </span>
                        <div className="bg-slate-50 p-2 rounded-full border border-slate-100">
                          <BarChart3 size={14} className="text-slate-400" />
                        </div>
                      </div>
                      <h4 className="text-lg font-black tracking-tight mb-4 group-hover:text-primary-green transition-colors">
                        {survey.label}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>{survey.fechaFin || survey.publicacion}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <span>n={survey.muestra || '?'}</span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-8 order-1 lg:order-2">
            <div className="bg-white border border-slate-200/80 p-1.5 rounded-[2.5rem] shadow-md overflow-hidden group sticky top-28">
              <div className="bg-slate-100 rounded-[2.3rem] aspect-4/5 relative overflow-hidden">
                <div className="absolute inset-0">
                  <MapViewWrapper
                    selectedEntityId={municipalityEntityId || undefined}
                    onMunicipalitySelect={handleMunicipalitySelect}
                  />
                </div>

                <div className="absolute top-6 left-6 right-6 pointer-events-none">
                  <div className="bg-white/95 backdrop-blur-md text-slate-900 p-5 rounded-3xl border border-slate-200/80 shadow-xl">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        Analizando
                      </span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter flex items-center gap-2">
                      {userMunicipalityName
                        ? `Municipio de ${userMunicipalityName}`
                        : 'Bolivia'}
                      {refreshing && !loading && (
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">
                          Actualizando…
                        </span>
                      )}
                    </h3>
                  </div>
                </div>
                {/*
                <div className="absolute bottom-6 left-6 right-6 text-center pointer-events-none">
                  <a
                    href={buildPath('/mapa')}
                    className="pointer-events-auto block"
                  >
                    <button className="w-full py-3.5 bg-primary-green text-white rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-lg hover:scale-105 transition-transform active:scale-95 cursor-pointer">
                      Ver mapa completo
                    </button>
                  </a>
                </div>*/}
              </div>
            </div>

            {/*<FeaturedPoll />*/}
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EntityDashboard);
