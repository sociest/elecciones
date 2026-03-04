import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import { Search, ChevronRight, ArrowUpRight, UserCheck } from 'lucide-react';

interface Candidate {
  nombre: string;
  partido: string;
  link: string;
}

interface CandidateListProps {
  candidatos: Candidate[];
  titulo: string;
}

export function CandidateList({ candidatos, titulo }: CandidateListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const filteredCandidates = useMemo(() => {
    if (!searchTerm) return candidatos;
    const lower = searchTerm.toLowerCase();
    return candidatos.filter((c) => c.nombre.toLowerCase().includes(lower));
  }, [candidatos, searchTerm]);

  const visibleCandidates = useMemo(() => {
    return filteredCandidates.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredCandidates, page]);

  const hasMore = visibleCandidates.length < filteredCandidates.length;

  const observerTarget = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (hasMore) {
      setPage((p) => p + 1);
    }
  }, [hasMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: '100px' }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    const currentTarget = observerTarget.current;
    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [loadMore]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-green-600 text-white rounded-xl shrink-0">
            <UserCheck size={20} />
          </div>
          <h3
            className="text-3xl font-black text-slate-900 tracking-tight"
            style={{ textWrap: 'balance' }}
          >
            Postulantes registrados
          </h3>
        </div>
        <div className="relative group w-full sm:w-auto">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-600 transition-colors"
            size={14}
          />
          <input
            type="text"
            placeholder="Buscar candidato..."
            value={searchTerm}
            onChange={handleSearch}
            className="bg-slate-100 border-none rounded-xl py-2.5 pl-9 pr-4 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-green-500 transition-all w-full sm:w-48 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {visibleCandidates.length > 0 ? (
          visibleCandidates.map((c) => (
            <a
              key={c.link || `${c.nombre}-${c.partido}`}
              href={c.link}
              className="group bg-white border border-slate-200 p-6 rounded-[3rem] hover:border-green-500 hover:shadow-xl hover:shadow-green-500/5 transition-all relative overflow-hidden flex flex-col justify-between"
            >
              <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                <ArrowUpRight size={20} className="text-green-600" />
              </div>

              <div className="pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                  {titulo}
                </p>

                <h4
                  className="text-xl font-black leading-none mb-6 text-slate-800 group-hover:text-green-600 pr-8"
                  style={{ textWrap: 'balance' }}
                >
                  {c.nombre}
                </h4>
              </div>

              <div className="flex justify-between items-center pt-5 border-t border-slate-200 mt-auto">
                <span className="text-[9px] font-black bg-slate-100 text-slate-500 group-hover:bg-green-50 group-hover:text-green-600 px-3 py-1 rounded-lg uppercase tracking-wider transition-colors">
                  Ver Perfil Completo
                </span>
                <ChevronRight
                  size={14}
                  className="text-slate-300 group-hover:text-green-600 group-hover:translate-x-1 transition-all"
                />
              </div>
            </a>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-500 font-medium">
            No se encontraron postulantes que coincidan con su búsqueda.
          </div>
        )}
      </div>

      {hasMore && (
        <div
          ref={observerTarget}
          className="py-8 flex flex-col items-center justify-center gap-3"
        >
          <div className="flex gap-1">
            <div
              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '0ms' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '150ms' }}
            ></div>
            <div
              className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"
              style={{ animationDelay: '300ms' }}
            ></div>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-slate-400">
            Cargando resultados...
          </span>
        </div>
      )}
    </div>
  );
}
