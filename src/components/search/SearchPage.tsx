import React, { useReducer, useEffect, useMemo, useRef, memo } from 'react';
import {
  Search,
  Filter,
  X,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Activity,
} from 'lucide-react';
import { fetchEntitiesFiltered } from '../../lib/queries';
import type { Entity } from '../../lib/queries';
import { buildPath } from '@/lib/utils/paths';
import { inferEntityTypeFromLabel } from '../../lib/appwrite/entity-utils';
import { PaginationControls } from '../ui/PaginationControls';

const ITEMS_PER_PAGE = 24;
const SEARCH_DEBOUNCE_MS = 500;
const FETCH_LIMIT = 1000;
const DEFAULT_DEPARTMENT = 'Todos';
const DEFAULT_TYPE = 'Todas';
const NO_NAME = 'Sin nombre';

const DEPARTMENTS = [
  'Todos',
  'La Paz',
  'Santa Cruz',
  'Cochabamba',
  'Oruro',
  'Potosí',
  'Chuquisaca',
  'Tarija',
  'Beni',
  'Pando',
];

const ENTITY_TYPES = [
  { value: 'Todas', label: 'Todas las entidades' },
  { value: 'Municipio', label: 'Municipios' },
  { value: 'Persona', label: 'Personas' },
  { value: 'Partido', label: 'Partidos Políticos' },
  { value: 'Territorio', label: 'Territorios' },
];

const QUICK_FILTERS = [
  { label: 'Todos', type: 'Todas' },
  { label: 'Postulantes', type: 'Persona' },
  { label: 'Partidos', type: 'Partido' },
  { label: 'Otras Entidades', type: 'Territorio' },
];

interface SearchPageProps {
  initialDepartment?: string;
  initialType?: string;
  initialQuery?: string;
}

interface SearchPageState {
  isInitialized: boolean;
  selectedDepartment: string;
  selectedType: string;
  searchQuery: string;
  debouncedSearch: string;
  entities: Entity[];
  loading: boolean;
  currentPage: number;
  showFilters: boolean;
}

type SearchPageAction =
  | {
      type: 'INITIALIZE';
      payload: { q: string; department: string; type: string };
    }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_DEBOUNCED_SEARCH'; payload: string; resetPage?: boolean }
  | { type: 'SET_SELECTED_DEPARTMENT'; payload: string }
  | { type: 'SET_SELECTED_TYPE'; payload: string }
  | { type: 'SET_ENTITIES'; payload: Entity[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_SHOW_FILTERS'; payload: boolean }
  | { type: 'RESET_FILTERS' };

const searchPageReducer = (
  state: SearchPageState,
  action: SearchPageAction
): SearchPageState => {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...state,
        isInitialized: true,
        searchQuery: action.payload.q,
        debouncedSearch: action.payload.q,
        selectedDepartment: action.payload.department,
        selectedType: action.payload.type,
      };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_DEBOUNCED_SEARCH':
      return {
        ...state,
        debouncedSearch: action.payload,
        currentPage: action.resetPage ? 1 : state.currentPage,
      };
    case 'SET_SELECTED_DEPARTMENT':
      return { ...state, selectedDepartment: action.payload };
    case 'SET_SELECTED_TYPE':
      return { ...state, selectedType: action.payload };
    case 'SET_ENTITIES':
      return { ...state, entities: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_SHOW_FILTERS':
      return { ...state, showFilters: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        searchQuery: '',
        debouncedSearch: '',
        selectedDepartment: DEFAULT_DEPARTMENT,
        selectedType: DEFAULT_TYPE,
        currentPage: 1,
      };
    default:
      return state;
  }
};

const EntityCard = memo<{ entity: Entity }>(({ entity }) => {
  const inferredType = entity.label
    ? inferEntityTypeFromLabel(entity.label)
    : 'UNKNOWN';

  let typeLabel = 'Perfil';
  let showVerified = false;

  if (inferredType === 'POLITICO' || inferredType === 'PERSONA') {
    typeLabel = 'Postulante';
    showVerified = true;
  } else if (inferredType === 'PARTIDO_POLITICO') {
    typeLabel = 'Partido Político';
  } else if (inferredType === 'ENCUESTA') {
    typeLabel = 'Encuesta';
  } else if (inferredType === 'CASA_ENCUESTADORA') {
    typeLabel = 'Encuestadora';
  } else if (inferredType === 'TERRITORIO') {
    typeLabel = 'Territorio';
  } else if (inferredType === 'INSTITUCION') {
    typeLabel = 'Institución';
  } else if (inferredType === 'EDUCACION') {
    typeLabel = 'Educación';
  }

  return (
    <a
      href={buildPath(`/entity?id=${entity.$id}`)}
      className="group bg-white border border-slate-100 p-8 rounded-[2.5rem] hover:border-primary-green/30 hover:shadow-xl hover:shadow-primary-green/5 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-80 animate-[fadeInUp_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]"
    >
      <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 group-hover:-translate-x-1 group-hover:translate-y-1 translate-x-4 -translate-y-4 transition-all duration-300">
        <ArrowUpRight size={24} className="text-primary-green" />
      </div>

      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-slate-50 text-slate-600 group-hover:text-primary-green group-hover:bg-primary-green/5 transition-colors px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-100">
            {typeLabel}
          </span>
          {showVerified && (
            <div className="flex items-center gap-1 text-blue-600 text-[9px] font-black uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-lg border border-blue-100">
              <ShieldCheck size={12} strokeWidth={3} />
              <span>Oficial</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-2xl font-black leading-[1.1] tracking-tight text-slate-800 group-hover:text-primary-green transition-colors mb-4">
            {entity.label || NO_NAME}
          </h3>

          {entity.description ? (
            <p className="text-sm font-medium text-slate-500 line-clamp-3 leading-relaxed">
              {entity.description}
            </p>
          ) : (
            <div className="flex items-start gap-3 bg-slate-50 group-hover:bg-primary-green/5 transition-colors p-4 rounded-2xl mt-4 border border-slate-100 group-hover:border-primary-green/10">
              <Activity
                size={16}
                className="mt-0.5 text-slate-400 group-hover:text-primary-green/50 shrink-0 transition-colors"
              />
              <p className="text-xs font-medium text-slate-500 leading-relaxed group-hover:text-primary-green/70 transition-colors">
                Haz clic para explorar los datos, declaraciones y vínculos
                asociados en la base de datos.
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center group-hover:border-primary-green/10 transition-colors">
        {entity.aliases && entity.aliases.length > 0 && (
          <div className="flex items-center gap-3 py-1.5 px-3 bg-slate-50 group-hover:bg-primary-green/5 rounded-xl transition-colors">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-primary-green line-clamp-1 max-w-30">
              {entity.aliases[0]}
            </span>
          </div>
        )}
        <div className="flex items-center gap-1 text-slate-400 text-[9px] font-black uppercase tracking-widest group-hover:text-primary-green transition-all group-hover:translate-x-1 ml-auto">
          Detalles{' '}
          <ChevronRight
            size={14}
            className="group-hover:translate-x-0.5 transition-transform"
          />
        </div>
      </div>
    </a>
  );
});

EntityCard.displayName = 'EntityCard';

const SearchPage: React.FC<SearchPageProps> = ({
  initialDepartment = DEFAULT_DEPARTMENT,
  initialType = DEFAULT_TYPE,
  initialQuery = '',
}) => {
  const [state, dispatch] = useReducer(searchPageReducer, {
    isInitialized: false,
    selectedDepartment: initialDepartment,
    selectedType: initialType,
    searchQuery: initialQuery,
    debouncedSearch: initialQuery,
    entities: [],
    loading: true,
    currentPage: 1,
    showFilters: false,
  });

  const isFirstMount = useRef(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !state.isInitialized) {
      const params = new URLSearchParams(window.location.search);
      const q = params.get('q') || initialQuery || '';
      const department = params.get('department') || initialDepartment;
      const type = params.get('type') || initialType;

      dispatch({
        type: 'INITIALIZE',
        payload: { q, department, type },
      });
    }
  }, [initialDepartment, initialQuery, initialType, state.isInitialized]);

  useEffect(() => {
    if (state.isInitialized && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (state.debouncedSearch)
        url.searchParams.set('q', state.debouncedSearch);
      else url.searchParams.delete('q');

      if (state.selectedDepartment !== DEFAULT_DEPARTMENT)
        url.searchParams.set('department', state.selectedDepartment);
      else url.searchParams.delete('department');

      if (state.selectedType !== DEFAULT_TYPE)
        url.searchParams.set('type', state.selectedType);
      else url.searchParams.delete('type');

      window.history.replaceState({}, '', url.toString());
    }
  }, [
    state.debouncedSearch,
    state.selectedDepartment,
    state.selectedType,
    state.isInitialized,
  ]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }

    const timer = setTimeout(() => {
      dispatch({
        type: 'SET_DEBOUNCED_SEARCH',
        payload: state.searchQuery,
        resetPage: true,
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [state.searchQuery]);

  useEffect(() => {
    if (!state.isInitialized) return;

    async function loadData() {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        const entitiesData = await fetchEntitiesFiltered({
          limit: FETCH_LIMIT,
          entityType: state.selectedType,
          department: state.selectedDepartment,
          search: state.debouncedSearch.trim() || undefined,
        });

        dispatch({ type: 'SET_ENTITIES', payload: entitiesData.documents });
      } catch (error) {
        console.error('Error loading entities:', error);
        dispatch({ type: 'SET_ENTITIES', payload: [] });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    }
    loadData();
  }, [
    state.selectedDepartment,
    state.selectedType,
    state.debouncedSearch,
    state.isInitialized,
  ]);

  const paginationData = useMemo(() => {
    const totalPages = Math.max(
      1,
      Math.ceil(state.entities.length / ITEMS_PER_PAGE)
    );
    const startIndex = (state.currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentEntities = state.entities.slice(startIndex, endIndex);

    return { totalPages, currentEntities };
  }, [state.entities, state.currentPage]);

  const { totalPages, currentEntities } = paginationData;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased pb-24">
      <div className="max-w-7xl mx-auto px-6 mt-36">
        <div className="flex flex-col md:flex-row justify-between items-end gap-8 border-b border-slate-200 pb-12">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-none text-slate-800">
              Hay{' '}
              <span className="text-primary-green">
                {state.loading ? '...' : state.entities.length}
              </span>{' '}
              coincidencias
            </h2>
            {state.debouncedSearch && (
              <p className="text-lg font-medium text-slate-500">
                Mostrando resultados para la búsqueda de{' '}
                <span className="text-primary-green font-bold">
                  &quot;{state.debouncedSearch}&quot;
                </span>
              </p>
            )}
          </div>
          <div className="flex p-1.5 bg-white shadow-sm rounded-full border border-slate-200 overflow-x-auto w-full md:w-auto hidescrollbar shrink-0">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.label}
                onClick={() =>
                  dispatch({ type: 'SET_SELECTED_TYPE', payload: f.type })
                }
                className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${state.selectedType === f.type ? 'bg-primary-green text-white shadow-md' : 'text-slate-500 hover:text-primary-green hover:bg-slate-50'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="relative z-40 py-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4 mb-2">
            <div className="relative w-full group flex-1">
              <Search
                className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary-green transition-colors duration-300"
                size={22}
              />
              <input
                type="text"
                value={state.searchQuery}
                onChange={(e) =>
                  dispatch({
                    type: 'SET_SEARCH_QUERY',
                    payload: e.target.value,
                  })
                }
                placeholder="Busca por nombre de candidato, partido o ciudad..."
                className="w-full bg-white border border-slate-200 rounded-full py-4 pl-16 pr-12 text-lg font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-green/20 focus:border-primary-green transition-all shadow-sm hover:shadow-md"
              />
              {state.searchQuery && (
                <button
                  onClick={() =>
                    dispatch({ type: 'SET_SEARCH_QUERY', payload: '' })
                  }
                  className="absolute right-6 top-1/2 -translate-y-1/2 p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            <button
              onClick={() =>
                dispatch({
                  type: 'SET_SHOW_FILTERS',
                  payload: !state.showFilters,
                })
              }
              className={`flex items-center gap-2 px-8 py-4 rounded-full font-black text-[11px] uppercase tracking-widest transition-all shrink-0 ${state.showFilters ? 'bg-primary-green text-white shadow-lg shadow-primary-green/20' : 'bg-white text-slate-600 border border-slate-200 hover:border-primary-green hover:text-primary-green shadow-sm'}`}
            >
              <Filter
                size={16}
                className={state.showFilters ? '' : 'text-slate-400'}
              />
              Filtros Avanzados
            </button>
          </div>

          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${state.showFilters ? 'max-h-96 opacity-100 mb-8' : 'max-h-0 opacity-0 mb-0'}`}
          >
            <div className="mt-2 p-6 bg-white border border-slate-100 rounded-3xl shadow-sm flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <label
                  htmlFor="filter-department"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block"
                >
                  Departamento
                </label>
                <select
                  id="filter-department"
                  value={state.selectedDepartment}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_SELECTED_DEPARTMENT',
                      payload: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-green/20 focus:border-primary-green transition-all"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label
                  htmlFor="filter-type"
                  className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3 block"
                >
                  Tipo de Entidad
                </label>
                <select
                  id="filter-type"
                  value={state.selectedType}
                  onChange={(e) =>
                    dispatch({
                      type: 'SET_SELECTED_TYPE',
                      payload: e.target.value,
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary-green/20 focus:border-primary-green transition-all"
                >
                  {ENTITY_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {state.loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={`loading-skeleton-${i}`}
                className="bg-white border border-slate-100 p-8 rounded-[2.5rem] min-h-80 animate-pulse flex flex-col space-y-4 shadow-sm"
              >
                <div className="w-24 h-6 bg-slate-100 rounded-md"></div>
                <div className="w-3/4 h-8 bg-slate-100 rounded-md mt-4"></div>
                <div className="w-1/2 h-4 bg-slate-50 rounded-md"></div>
                <div className="w-full h-16 bg-slate-50 rounded-xl mt-auto"></div>
              </div>
            ))}
          </div>
        ) : state.entities.length === 0 ? (
          <div className="py-24 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm animate-[fadeInUp_0.4s_ease-out_forwards]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-110 duration-500">
              <Search size={32} className="text-slate-300" />
            </div>
            <h3 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">
              Sin resultados
            </h3>
            <p className="text-slate-500 font-medium max-w-md mx-auto mb-8 leading-relaxed">
              No encontramos coincidencias para esta búsqueda. Intenta usar
              palabras diferentes o limpiar los filtros.
            </p>
            <button
              onClick={() => dispatch({ type: 'RESET_FILTERS' })}
              className="px-8 py-3.5 bg-primary-green text-white rounded-full font-black text-[11px] uppercase tracking-widest shadow-lg shadow-primary-green/20 hover:scale-[1.03] transition-all active:scale-95"
            >
              Restablecer Búsqueda
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentEntities.map((entity) => (
              <EntityCard key={entity.$id} entity={entity} />
            ))}
          </div>
        )}

        {!state.loading && state.entities.length > 0 && totalPages > 1 && (
          <PaginationControls
            currentPage={state.currentPage}
            totalPages={totalPages}
            onPageChange={(page) =>
              dispatch({ type: 'SET_CURRENT_PAGE', payload: page })
            }
          />
        )}
      </div>

      <style>{`.hidescrollbar::-webkit-scrollbar{display:none}.hidescrollbar{-ms-overflow-style:none;scrollbar-width:none}`}</style>
    </div>
  );
};

export default SearchPage;
