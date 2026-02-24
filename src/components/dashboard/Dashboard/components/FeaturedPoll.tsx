import React, { useEffect, useReducer } from 'react';
import { BarChart3, ChevronRight } from 'lucide-react';
import { fetchEntityDetails } from '../../../../lib/queries/entities';
import { buildPath } from '../../../../lib/utils/paths';

type State = {
    poll: any;
    loading: boolean;
};

type Action =
    | { type: 'LOAD_START' }
    | { type: 'LOAD_SUCCESS'; poll: any }
    | { type: 'LOAD_ERROR' };

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case 'LOAD_START':
            return { ...state, loading: true };
        case 'LOAD_SUCCESS':
            return { poll: action.poll, loading: false };
        case 'LOAD_ERROR':
            return { ...state, loading: false };
        default:
            return state;
    }
};

export const FeaturedPoll: React.FC = () => {
    const pollId = "6998957ee05da570839c";
    const [{ poll, loading }, dispatch] = useReducer(reducer, {
        poll: null,
        loading: true,
    });

    useEffect(() => {
        let mounted = true;
        dispatch({ type: 'LOAD_START' });

        fetchEntityDetails(pollId)
            .then(data => {
                if (mounted) {
                    dispatch({ type: 'LOAD_SUCCESS', poll: data });
                }
            })
            .catch(err => {
                console.error("Error fetching poll details:", err);
                if (mounted) {
                    dispatch({ type: 'LOAD_ERROR' });
                }
            });

        return () => { mounted = false; };
    }, []);

    if (loading) {
        return (
            <div className="bg-primary-green p-8 rounded-[2.5rem] relative overflow-hidden animate-pulse h-[240px]">
                <div className="bg-white/10 h-4 w-32 rounded mb-4"></div>
                <div className="bg-white/10 h-8 w-48 rounded mb-6"></div>
                <div className="bg-white/10 rounded-3xl h-24"></div>
            </div>
        );
    }

    if (!poll || !poll.entity) return null;

    const findClaimValue = (propId: string) => {
        const claim = poll.claims.find((c: any) =>
            (c.property?.$id === propId || c.property === propId) && typeof c.value_string === 'string'
        );
        return claim ? claim.value_string : null;
    };

    const findRelationTitle = (propId: string) => {
        const claim = poll.claims.find((c: any) =>
            (c.property?.$id === propId || c.property === propId) && c.value_relation
        );
        return claim?.value_relation?.label || claim?.value_relation?.name || null;
    };


    const encuestadora = findRelationTitle('REALIZADO_POR') || findRelationTitle('AUTOR') || "UPEA El Alto";
    const fecha = findClaimValue('FECHA_PUBLICACION') || "Feb 2026";
    const descripcion = poll.entity.description || "Intención de Voto";

    return (
        <a
            href={buildPath(`/entity?id=${pollId}`)}
            className="block bg-primary-green text-hunter p-8 rounded-[2.5rem] relative overflow-hidden group hover:shadow-2xl hover:shadow-primary-green/20 transition-all cursor-pointer"
        >
            <BarChart3
                className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none"
            />
            <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-hunter/40 block">
                    Encuesta Destacada
                </span>
                <ChevronRight size={16} className="opacity-40 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </div>

            <h4 className="text-xl md:text-2xl font-black tracking-tighter mb-2 leading-tight pr-4">
                {poll.entity.label}
            </h4>
            <div className="flex items-center gap-2 mb-8">
                <p className="text-xs font-medium opacity-80 tracking-widest uppercase">
                    {encuestadora}
                </p>
                <span className="w-1 h-1 rounded-full bg-hunter/30"></span>
                <p className="text-[10px] font-black opacity-50 uppercase tracking-widest">
                    {fecha}
                </p>
            </div>

            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 group-hover:bg-white/10 transition-colors">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">
                    Visualizar Resultados
                </p>
                <div className="flex justify-between items-end">
                    <span className="text-sm font-bold opacity-80">{descripcion}</span>
                    <span className="text-xs font-black text-hunter bg-hunter/10 px-3 py-1.5 rounded-full">Abrir Datos</span>
                </div>
            </div>
        </a>
    );
};
