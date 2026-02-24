import React, { useEffect, useReducer } from "react";
import { Query } from "appwrite";
import { databases, DATABASE_ID, COLLECTIONS } from "../../lib/appwrite";
import { buildPath } from "../../lib/utils/paths";
import { Loader2, BarChart2, Briefcase, ChevronRight, PieChart } from "lucide-react";
import { ENTITY_TYPE_IDS, PROPERTY_IDS } from "../../lib/constants/entity-types";
import type { Entity, Claim } from "../../lib/queries/types";

type State = {
    encuestas: Entity[];
    casas: Entity[];
    loading: boolean;
};

type Action =
    | { type: "LOAD_START" }
    | { type: "LOAD_SUCCESS"; encuestas: Entity[]; casas: Entity[] }
    | { type: "LOAD_ERROR" };

const reducer = (state: State, action: Action): State => {
    switch (action.type) {
        case "LOAD_START":
            return { ...state, loading: true };
        case "LOAD_SUCCESS":
            return {
                encuestas: action.encuestas,
                casas: action.casas,
                loading: false,
            };
        case "LOAD_ERROR":
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
            dispatch({ type: "LOAD_START" });
            try {
                // 1. Fetch Casas Encuestadoras
                const casasClaims = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.CLAIMS,
                    [
                        Query.equal("property", PROPERTY_IDS.ES_INSTANCIA_DE),
                        Query.equal("value_relation", ENTITY_TYPE_IDS.CASA_ENCUESTADORA),
                        Query.limit(100)
                    ]
                );

                const casaIds = casasClaims.documents.map(c => typeof c.subject === 'string' ? c.subject : c.subject?.$id).filter(Boolean);

                let loadedCasas: Entity[] = [];
                if (casaIds.length > 0) {
                    const uniqueCasaIds = [...new Set(casaIds)];

                    // Fetch entities in batches if more than 100
                    for (let i = 0; i < uniqueCasaIds.length; i += 100) {
                        const batch = uniqueCasaIds.slice(i, i + 100);
                        const cRes = await databases.listDocuments<Entity>(
                            DATABASE_ID,
                            COLLECTIONS.ENTITIES,
                            [Query.equal("$id", batch), Query.limit(100)]
                        );
                        loadedCasas = [...loadedCasas, ...cRes.documents];
                    }
                }
                const casasResult = loadedCasas;

                // 2. Fetch Encuestas
                const encuestasClaims = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.CLAIMS,
                    [
                        Query.equal("property", PROPERTY_IDS.ES_INSTANCIA_DE),
                        Query.equal("value_relation", ENTITY_TYPE_IDS.ENCUESTA_ELECTORAL),
                        Query.limit(100)
                    ]
                );

                const encuestasIds = encuestasClaims.documents.map(c => typeof c.subject === 'string' ? c.subject : c.subject?.$id).filter(Boolean);

                let loadedEncuestas: Entity[] = [];
                if (encuestasIds.length > 0) {
                    const uniqueEncuestaIds = [...new Set(encuestasIds)];

                    // Fetch entities in batches if more than 100
                    for (let i = 0; i < uniqueEncuestaIds.length; i += 100) {
                        const batch = uniqueEncuestaIds.slice(i, i + 100);
                        const cRes = await databases.listDocuments<Entity>(
                            DATABASE_ID,
                            COLLECTIONS.ENTITIES,
                            [Query.equal("$id", batch), Query.limit(100)]
                        );
                        loadedEncuestas = [...loadedEncuestas, ...cRes.documents];
                    }
                }
                const encuestasResult = loadedEncuestas;
                dispatch({
                    type: "LOAD_SUCCESS",
                    encuestas: encuestasResult,
                    casas: casasResult,
                });

            } catch (err) {
                console.error("Error fetching encuestas data", err);
                dispatch({ type: "LOAD_ERROR" });
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-12 h-12 text-hunter animate-spin mb-4" />
                <p className="text-hunter/60 font-medium">Buscando encuestas publicadas...</p>
            </div>
        );
    }

    return (
        <div className="space-y-16">

            {/* Seccion Encuestas */}
            <section>
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                        <BarChart2 className="w-6 h-6 text-hunter" />
                    </div>
                    <h2 className="text-3xl font-black text-hunter tracking-tight">Estudios Registrados</h2>
                </div>

                {encuestas.length === 0 ? (
                    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 text-center">
                        <p className="text-hunter/50 italic">No se encontraron encuestas registradas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {encuestas.map(encuesta => (
                            <a
                                key={encuesta.$id}
                                href={buildPath(`/entity?id=${encuesta.$id}`)}
                                className="group relative p-6 rounded-[2rem] bg-white/5 border border-white/10 hover:bg-white/10 transition-colors shadow-lg hover:shadow-xl overflow-hidden"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-bl-[4rem] flex items-center justify-center -translate-y-10 translate-x-10 group-hover:scale-110 transition-transform text-hunter/10 pointer-events-none">
                                    <PieChart className="w-16 h-16" />
                                </div>
                                <h3 className="text-xl font-bold text-hunter mb-2 leading-tight pr-6">{encuesta.label || "Sin Título"}</h3>
                                <p className="text-sm text-hunter/60 line-clamp-3 leading-relaxed mb-6">
                                    {encuesta.description || "Sin descripción proporcionada."}
                                </p>
                                <div className="flex items-center justify-between mt-auto">
                                    <span className="text-xs font-bold uppercase tracking-wider text-hunter/40 group-hover:text-hunter/80 transition-colors">
                                        Ver Estudio
                                    </span>
                                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-hunter group-hover:text-primary-green transition-colors">
                                        <ChevronRight className="w-4 h-4" />
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
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                        <Briefcase className="w-6 h-6 text-hunter" />
                    </div>
                    <h2 className="text-3xl font-black text-hunter tracking-tight">Casas Encuestadoras</h2>
                </div>

                {casas.length === 0 ? (
                    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 text-center">
                        <p className="text-hunter/50 italic">No se encontraron casas encuestadoras registradas.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                        {casas.map(casa => (
                            <a
                                key={casa.$id}
                                href={buildPath(`/entity?id=${casa.$id}`)}
                                className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                            >
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-hunter shrink-0 font-bold overflow-hidden shadow-inner uppercase">
                                    {casa.label?.substring(0, 2) || "CA"}
                                </div>
                                <div>
                                    <h4 className="font-bold text-hunter text-sm leading-tight">{casa.label}</h4>
                                    <span className="text-[10px] text-hunter/40 uppercase tracking-widest font-black">
                                        Empresa
                                    </span>
                                </div>
                            </a>
                        ))}
                    </div>
                )}
            </section>

        </div>
    );
}
