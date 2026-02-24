import React, { useCallback, useMemo, useState } from "react";
import {
    ListFilter,
    Users
} from "lucide-react";
import MapViewWrapper from "../MapViewWrapper/MapViewWrapper";
import { SearchCommand } from "../SearchCommand/SearchCommand";
import { useMunicipalityInitialization } from "./hooks/useMunicipalityInitialization";
import { useDashboardData } from "./hooks/useDashboardData";
import { useDashboardState } from "./hooks/useDashboardState";
import { buildPath } from "../../../lib/utils/paths";
import { EntityCard } from "./EntityCard";
import { FeaturedPoll } from "./components/FeaturedPoll";
import { PaginationControls } from "../../ui/PaginationControls";

const ITEMS_PER_PAGE = 10;

const EntityDashboard: React.FC = () => {
    const {
        userLocation,
        userMunicipalityName,
        municipalityEntityId,
        setUserMunicipalityName,
        setMunicipalityEntityId
    } = useMunicipalityInitialization();

    /* State for Filters */
    const [selectedFilter, setSelectedFilter] = React.useState<string>("Todos");
    const [currentPage, setCurrentPage] = useState(1);

    const { entities, loading, refreshing } = useDashboardData(userMunicipalityName, municipalityEntityId);
    const showLoading = loading || (refreshing && entities.length === 0);

    const { selectedMunicipality, setSelectedMunicipality } = useDashboardState(
        null,
        null,
        userLocation,
    );

    const handleMunicipalitySelect = useCallback((municipality: { name: string; department: string; entityId: string; hasEntity?: boolean }) => {
        setSelectedMunicipality({
            name: municipality.name,
            department: municipality.department,
        });
        setMunicipalityEntityId(municipality.entityId);
        setUserMunicipalityName(municipality.name);
        setCurrentPage(1);
    }, [setSelectedMunicipality, setMunicipalityEntityId, setUserMunicipalityName]);

    /* Filter Logic */
    const filteredEntities = useMemo(() => {
        if (selectedFilter === "Todos") return entities;

        return entities.filter((entity: any) => {
            const role = entity.role || "";
            if (selectedFilter === "Alcaldes") return role.includes("Alcalde");
            if (selectedFilter === "Concejales") return role.includes("Concejal");
            if (selectedFilter === "Gobernadores") return role.includes("Gobernador");
            if (selectedFilter === "Asambleístas") {
                return role.includes("Asambleísta")
            }
            return true;
        });
    }, [entities, selectedFilter]);

    // Pagination Logic
    const totalPages = Math.max(1, Math.ceil(filteredEntities.length / ITEMS_PER_PAGE));
    const currentEntities = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filteredEntities.slice(start, start + ITEMS_PER_PAGE);
    }, [filteredEntities, currentPage]);

    return (
        <div className="min-h-screen bg-neutral-white text-primary-green selection:bg-primary-green selection:text-hunter antialiased">
            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto pt-32 px-6 pb-20">
                <header className="mb-16">
                    <div className="max-w-3xl">
                        <h2 className="text-5xl md:text-7xl font-black tracking-[ -0.05em] leading-[0.85] mb-8">
                            Conoce a tus <br />
                            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary-green to-primary-green/40">
                                Candidatos.
                            </span>
                        </h2>

                        <div className="relative group">
                            <SearchCommand
                                onSelect={useCallback((entity: any) => {
                                    window.location.href = buildPath(`/entity?id=${entity.$id}`);
                                }, [])}
                                className="w-full"
                            />
                        </div>

                        <div className="flex flex-wrap gap-2 mt-6">
                            {[
                                "Gobernadores",
                                "Alcaldes",
                                "Concejales",
                                "Asambleístas",
                                "Todos",
                            ].map((filtro) => (
                                <button
                                    key={`filter-${filtro}`}
                                    onClick={() => {
                                        setSelectedFilter(filtro);
                                        setCurrentPage(1);
                                    }}
                                    className={`px-5 py-2 rounded-full border text-[11px] font-black uppercase tracking-widest transition-all ${selectedFilter === filtro
                                        ? "bg-primary-green text-hunter border-primary-green"
                                        : "bg-transparent border-primary-green/10 text-primary-green hover:bg-primary-green hover:text-hunter"
                                        }`}
                                >
                                    {filtro}
                                </button>
                            ))}
                            <button className="p-2 rounded-full bg-primary-green/5 text-primary-green hover:bg-hunter border border-transparent hover:border-primary-green/10 transition-all">
                                <ListFilter size={18} />
                            </button>
                        </div>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-8 order-2 lg:order-1 min-h-[60rem]">
                        <div className="flex items-center justify-between border-b border-primary-green/5 pb-4">
                            <div className="flex items-center gap-2">
                                <Users size={18} className="opacity-30" />
                                <h3 className="font-black text-[10px] uppercase tracking-[0.3em] opacity-30">
                                    {selectedFilter === "Todos" ? "Postulantes en tu región" : `Resultados: ${selectedFilter}`}
                                </h3>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                            {showLoading ? (
                                [1, 2, 3, 4].map((_, index) => (
                                    <div
                                        key={`loading-skeleton-${index}`}
                                        className="bg-white border border-primary-green/5 p-6 rounded-[2.5rem] h-60 animate-pulse"
                                    >
                                        <div className="h-4 w-24 rounded bg-primary-green/5 mb-4"></div>
                                        <div className="h-8 w-3/4 rounded bg-primary-green/5 mb-3"></div>
                                        <div className="h-4 w-1/2 rounded bg-primary-green/5"></div>
                                    </div>
                                ))
                            ) : (
                                currentEntities.length > 0 ? (
                                    currentEntities.map((entity) => (
                                        <EntityCard
                                            key={entity.$id}
                                            entity={entity}
                                            municipalityName={userMunicipalityName || "Bolivia"}
                                        />
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center opacity-50 font-medium flex flex-col items-center gap-2 absolute top-0 w-full">
                                        <span>No se encontraron resultados para "{selectedFilter}".</span>
                                    </div>
                                )
                            )}
                        </div>

                        {!showLoading && filteredEntities.length > 0 && (
                            <PaginationControls
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={(page) => setCurrentPage(page)}
                            />
                        )}

                    </div>

                    <div className="lg:col-span-4 space-y-8 order-1 lg:order-2">
                        <div className="bg-primary-green p-1 rounded-[2.5rem] shadow-2xl overflow-hidden group sticky top-28">
                            <div className="bg-hunter rounded-[2.3rem] aspect-4/5 relative overflow-hidden">
                                <div className="absolute inset-0">
                                    <MapViewWrapper
                                        selectedEntityId={municipalityEntityId || undefined}
                                        onMunicipalitySelect={handleMunicipalitySelect}
                                    />
                                </div>

                                <div className="absolute top-6 left-6 right-6 pointer-events-none">
                                    <div className="bg-primary-green/90 backdrop-blur-md text-hunter p-5 rounded-3xl border border-white/10 shadow-2xl">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                Analizando
                                            </span>
                                        </div>
                                        <h5 className="text-xl font-black tracking-tighter flex items-center gap-2">
                                            {userMunicipalityName ? `Municipio de ${userMunicipalityName}` : "Bolivia"}
                                            {refreshing && !loading && (
                                                <span className="text-[10px] uppercase tracking-widest opacity-70">
                                                    Actualizando…
                                                </span>
                                            )}
                                        </h5>
                                    </div>
                                </div>

                                <div className="absolute bottom-6 left-6 right-6 text-center pointer-events-none">
                                    <a href={buildPath("/mapa")} className="pointer-events-auto block">
                                        <button className="w-full py-3 bg-primary-green text-hunter rounded-xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-transform active:scale-95 cursor-pointer">
                                            Ver mapa completo
                                        </button>
                                    </a>
                                </div>
                            </div>
                        </div>

                        <FeaturedPoll />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(EntityDashboard);
