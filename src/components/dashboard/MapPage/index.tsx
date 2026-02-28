import React, { useState, useCallback } from 'react';
import { Search, MapPin, Filter, X } from 'lucide-react';
import { buildPath } from '../../../lib/utils/paths';
import MapViewWrapper from '../MapViewWrapper/MapViewWrapper';
import { DEPARTMENTS, ENTITY_TYPES, RESULTS_PREVIEW_LIMIT } from './constants';
import { useMapFilters } from './hooks/useMapFilters';
import { useMapData } from './hooks/useMapData';
import DepartmentButton from './components/DepartmentButton';
import EntityTypeButton from './components/EntityTypeButton';
import ClearFiltersButton from './components/ClearFiltersButton';
import ResultEntityCard from './components/ResultEntityCard';

const MapPage: React.FC = () => {
  const {
    selectedDepartment,
    setSelectedDepartment,
    selectedType,
    setSelectedType,
    searchQuery,
    setSearchQuery,
    debouncedSearch,
  } = useMapFilters();

  const { entities, loading, mapZoomTarget } = useMapData(
    selectedDepartment,
    selectedType,
    debouncedSearch
  );

  const [showFilters, setShowFilters] = useState(true);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<{
    name: string;
    department: string;
    hasEntity?: boolean;
  } | null>(null);

  const handleMunicipalitySelect = useCallback(
    (
      municipality: {
        name: string;
        department: string;
        entityId: string;
        hasEntity?: boolean;
      },
      isAutoDetect = false
    ) => {
      setSelectedMunicipality({
        name: municipality.name,
        department: municipality.department,
        hasEntity: municipality.hasEntity,
      });

      if (!isAutoDetect) {
        setSelectedEntityId(municipality.entityId);
        setSearchQuery(municipality.name);
        if (
          selectedDepartment !== 'Todos' &&
          selectedDepartment !== municipality.department
        ) {
          setSelectedDepartment(municipality.department);
        }
      }
    },
    [setSearchQuery, selectedDepartment, setSelectedDepartment]
  );

  const handleMapReset = useCallback(() => {
    setSelectedMunicipality(null);
    setSelectedEntityId(null);
    setSearchQuery('');
    setSelectedDepartment('Todos');
  }, [setSearchQuery, setSelectedDepartment]);

  return (
    <div className="min-h-screen bg-neutral-white text-primary-green antialiased flex flex-col pt-24 md:pt-28">
      <main className="flex-1 w-full max-w-400 mx-auto px-4 md:px-8 flex flex-col overflow-hidden h-[calc(100vh-140px)]">
        {/* Page Header Area - Compacted to save space */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0 border-b border-primary-green/5 pb-6">
          <div className="space-y-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tighter leading-none">
              Mapa{' '}
              <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-green to-primary-green/40 italic">
                Interactivo
              </span>
            </h1>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-primary-green text-hunter rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-transform active:scale-95 shrink-0"
            >
              <Filter size={14} />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 overflow-hidden min-h-0 mb-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <aside className="w-full lg:w-[320px] space-y-4 overflow-y-auto pr-2 lg:h-full hidescrollbar shrink-0">
              {/* Search Bar */}
              <div className="bg-white border border-primary-green/5 rounded-[2rem] p-5 shadow-sm">
                <label
                  htmlFor="searchInput"
                  className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block"
                >
                  Buscar
                </label>
                <div className="relative">
                  <Search
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-green/20"
                  />
                  <input
                    id="searchInput"
                    type="text"
                    placeholder="Escribe aquí..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 bg-primary-green/5 border-2 border-transparent rounded-xl focus:outline-none focus:bg-white focus:border-primary-green transition-all text-sm font-bold"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-primary-green/40 hover:text-primary-green"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>

              {/* Department Filter */}
              <div className="bg-white border border-primary-green/5 rounded-[2rem] p-5 shadow-sm max-h-75 flex flex-col overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block shrink-0">
                  Departamento
                </p>
                <div className="grid grid-cols-1 gap-1.5 overflow-y-auto pr-1 hidescrollbar">
                  {DEPARTMENTS.map((dept) => (
                    <DepartmentButton
                      key={dept}
                      dept={dept}
                      isSelected={selectedDepartment === dept}
                      onSelect={() => setSelectedDepartment(dept)}
                    />
                  ))}
                </div>
              </div>

              {/* Type Filter */}
              <div className="bg-white border border-primary-green/5 rounded-[2rem] p-5 shadow-sm shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-3 block">
                  Categorías
                </p>
                <div className="grid grid-cols-1 gap-1.5">
                  {ENTITY_TYPES.map((type) => (
                    <EntityTypeButton
                      key={type.value}
                      type={type}
                      isSelected={selectedType === type.value}
                      onSelect={() => setSelectedType(type.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Results Count Widget */}
              <div className="bg-primary-green text-hunter rounded-[2rem] p-6 shadow-xl relative overflow-hidden group shrink-0">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1 relative z-10">
                  + de Resultados
                </p>
                <h4 className="text-4xl font-black tracking-tighter relative z-10">
                  {loading ? '...' : entities.length}
                </h4>
              </div>
            </aside>
          )}

          {/* Map and Results */}
          <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
            {/* Map Container */}
            <div className="flex-2 min-h-100 lg:h-full relative overflow-hidden bg-primary-green rounded-[3rem] border border-primary-green/10 shadow-2xl">
              <MapViewWrapper
                selectedEntityId={mapZoomTarget || selectedEntityId}
                onMunicipalitySelect={handleMunicipalitySelect}
                onMapReset={handleMapReset}
              />

              {/* Map Overlay Info - Compact */}
              {selectedMunicipality && (
                <div className="absolute top-4 left-4 right-4 md:top-6 md:left-6 md:right-auto md:w-80 pointer-events-none z-10">
                  <div className="bg-primary-green/95 backdrop-blur-md p-5 rounded-2xl border border-white/10 shadow-2xl pointer-events-auto animate-[fadeInUp_0.3s_ease-out]">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-hunter rounded-xl flex items-center justify-center text-primary-green shrink-0">
                          <MapPin size={20} />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-base font-black tracking-tighter text-hunter truncate leading-tight">
                            {selectedMunicipality.name}
                          </h5>
                          <p className="text-[9px] font-black uppercase tracking-widest text-hunter/60 truncate">
                            {selectedMunicipality.department}
                          </p>
                        </div>
                      </div>
                      {selectedMunicipality.hasEntity &&
                        selectedEntityId &&
                        !selectedEntityId.startsWith('municipality_') && (
                          <a
                            href={buildPath(`/entity?id=${selectedEntityId}`)}
                            className="px-4 py-2.5 bg-hunter text-primary-green rounded-lg text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-transform shadow-lg shrink-0"
                          >
                            Ver
                          </a>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Legend Overlay */}
              <div className="absolute bottom-6 left-6 pointer-events-none">
                <div className="bg-white/90 backdrop-blur-sm p-3 rounded-xl border border-black/5 shadow-sm text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary-green"></div>
                  <span>Jurisdicciones</span>
                </div>
              </div>
            </div>

            {/* Results List */}
            <div className="flex-1 min-h-100 lg:h-full bg-white border border-primary-green/5 rounded-[3rem] p-6 md:p-8 flex flex-col shadow-sm overflow-hidden">
              <div className="mb-4 shrink-0">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-3">
                  Lista de Resultados
                </h3>
                {(searchQuery ||
                  selectedDepartment !== 'Todos' ||
                  selectedType !== 'Todas') && (
                  <ClearFiltersButton
                    onClear={() => {
                      setSearchQuery('');
                      setSelectedDepartment('Todos');
                      setSelectedType('Todas');
                    }}
                  />
                )}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-3 hidescrollbar">
                {loading ? (
                  [1, 2, 3, 4].map((_, index) => (
                    <div
                      key={`placeholder-${index}`}
                      className="bg-primary-green/5 h-28 rounded-2xl animate-pulse"
                    ></div>
                  ))
                ) : entities.length === 0 ? (
                  <div className="text-center py-10 opacity-30">
                    <Search size={32} className="mx-auto mb-4" />
                    <p className="text-xs font-black uppercase tracking-widest">
                      Sin resultados
                    </p>
                  </div>
                ) : (
                  entities.slice(0, RESULTS_PREVIEW_LIMIT).map((entity) => (
                    <ResultEntityCard
                      key={entity.$id}
                      entity={entity}
                      isSelected={selectedEntityId === entity.$id}
                      onSelect={() => {
                        setSelectedEntityId(entity.$id);
                      }}
                    />
                  ))
                )}
              </div>

              {entities.length > RESULTS_PREVIEW_LIMIT && (
                <div className="pt-4 mt-4 border-t border-primary-green/5 shrink-0">
                  <a
                    href={buildPath(
                      `/search?department=${encodeURIComponent(selectedDepartment)}&type=${encodeURIComponent(selectedType)}&q=${encodeURIComponent(searchQuery)}`
                    )}
                    className="w-full block bg-primary-green text-hunter py-3.5 rounded-xl font-black text-[9px] uppercase tracking-widest text-center shadow-lg hover:scale-[1.02] transition-transform"
                  >
                    Ver todos ({entities.length})
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default React.memo(MapPage);
