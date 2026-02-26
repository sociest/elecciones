import React, { useMemo } from "react";
import {
  Users,
  Search,
  ChevronRight,
  ArrowUpRight,
  Calendar,
  MapPin,
  Landmark,
  ShieldCheck,
  Info,
  Fingerprint,
  Award,
  BarChart3,
  ExternalLink,
  Globe,
  User
} from "lucide-react";
import type { Entity, Claim } from "@/lib/queries/types";
import { buildPath } from "@/lib/utils/paths";
import { PROPERTY_IDS } from "@/lib/constants/entity-types";
const EMPTY_CLAIMS: Claim[] = [];

interface PartyProps {
  entity: Entity;
  claims: Claim[];
}

export function PartyView({ entity, claims = EMPTY_CLAIMS }: PartyProps) {
  const nombre = entity.label || "Partido Político";
  const sigla = entity.aliases?.[0] || "PP";
  const tipo = "Partido Político";
  const bgDescription = entity.description || "Agrupación política con participación a nivel nacional registrada en el OEP.";

  function claim_find(prop: string) {
    return claims.find((c) => {
      const prop_id = c.property?.["$id"]?.toLowerCase() || "";
      return prop_id.includes(prop);
    });
  }

  const foundationClaim = claim_find(PROPERTY_IDS.FUNDACION);
  const fundacion = foundationClaim?.value_raw || "Desconocida";

  const militantsClaim = claim_find(PROPERTY_IDS.MILITANTE);
  const militantes = militantsClaim?.value_raw || "No registrado";

  const ideologyClaim = claim_find(PROPERTY_IDS.ESPECTRO);
  const espectro = ideologyClaim?.value_relation?.label || ideologyClaim?.value_raw || "No definido";

  const tipo_organizacionClaim = claim_find(PROPERTY_IDS.TIPO_ORGANIZACION);
  const tipo_organizacion = tipo_organizacionClaim?.value_relation?.label || tipo_organizacionClaim?.value_raw || "No definido";

  const addressClaim = claim_find(PROPERTY_IDS.SED)
  const sede = addressClaim?.value_raw || "Sede principal no registrada";

  const colorClaim = claim_find(PROPERTY_IDS.COLOR);
  const colorRaw = colorClaim?.value_raw;
  let colors = ["#14281d", "#2d4a3e"];
  if (colorRaw) {
    if (colorRaw.includes(",")) {
      colors = colorRaw.split(",").map(c => c.trim());
    } else {
      colors = [colorRaw, colorRaw];
    }
  }

  const leaderClaim = claim_find(PROPERTY_IDS.PRESIDENTE);
  const leaderName = leaderClaim?.value_relation?.label || leaderClaim?.value_raw || "Directiva";
  const idLeader = typeof leaderClaim?.value_relation === 'object' ? leaderClaim?.value_relation?.$id : leaderClaim?.value_relation;
  const linkLeader = idLeader ? buildPath(`/entity?id=${idLeader}`) : "#";

  const logoClaim = claim_find(PROPERTY_IDS.LOGO);
  const logoUrl = logoClaim?.value_raw;

  const candidateClaim = claim_find(PROPERTY_IDS.CANDIDATO);
  const candidateName = candidateClaim?.value_relation?.label || candidateClaim?.value_raw || "Directiva";
  const idCandidate = typeof candidateClaim?.value_relation === 'object' ? candidateClaim?.value_relation?.$id : candidateClaim?.value_relation;
  const linkCandidate = idCandidate ? buildPath(`/entity?id=${idCandidate}`) : "#";

  const presidenteInfo = leaderClaim || candidateClaim;
  const presidenteName = presidenteInfo?.value_relation?.label || presidenteInfo?.value_raw || "Directiva";
  const idPresidente = typeof presidenteInfo?.value_relation === 'object' ? presidenteInfo?.value_relation?.$id : presidenteInfo?.value_relation;
  const linkLider = idPresidente ? buildPath(`/entity?id=${idPresidente}`) : "#";

  const idGrafo = entity.$id;

  // Date
  const modifiedDate = new Date(entity.$updatedAt || Date.now()).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-neutral-white text-primary-green font-sans antialiased pb-24">
      <section className="bg-primary-green pt-32 pb-24 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"
        >
        </div>

        <div
          className="max-w-6xl mx-auto relative z-10 text-center flex flex-col items-center"
        >
          <div className="mb-8 relative group">
            <div
              className={`w-36 h-36 rounded-[3rem] flex items-center justify-center shadow-2xl transition-transform duration-700 overflow-hidden relative ${!logoUrl ? 'rotate-3 group-hover:rotate-0 border-4 border-white/10' : ''}`}
              style={!logoUrl ? { background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` } : {}}
            >
              {logoUrl && (
                <>
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})` }}
                  />
                  <div className="absolute inset-1 bg-primary-green rounded-[2.8rem] z-0" />
                </>
              )}

              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={`Logo de ${nombre}`}
                  className="w-full h-full object-contain p-4 drop-shadow-md relative z-10"
                />
              ) : (
                <span
                  className="text-4xl font-black text-white drop-shadow-md relative z-10"
                >{sigla}</span>
              )}
            </div>
            <div
              className={`absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl ring-4 ring-primary-green z-20`}
            >
              <ShieldCheck size={20} strokeWidth={3} />
            </div>
          </div>

          <div className="max-w-3xl space-y-6">
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/10 rounded-full border border-white/10 backdrop-blur-md"
            >
              <span
                className="w-2 h-2 rounded-full bg-hunter animate-pulse"
              ></span>
              <span
                className="text-[10px] font-black uppercase tracking-[0.3em] text-hunter"
              >{tipo}</span>
            </div>
            <h1
              className="text-6xl md:text-8xl font-black text-hunter tracking-tighter leading-[0.85] mb-6"
              style={{ textWrap: "balance" }}
            >
              {nombre}
            </h1>
            <p
              className="text-xl text-hunter/60 font-medium leading-relaxed text-pretty"
            >
              {bgDescription}
            </p>
          </div>
        </div>
      </section>

      <div
        className="max-w-6xl mx-auto px-6 -mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20"
      >
        <div
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 group hover:-translate-y-1 transition-transform"
        >
          <div
            className="p-4 bg-primary-green/5 rounded-2xl text-primary-green group-hover:bg-primary-green group-hover:text-hunter transition-colors"
          >
            <Calendar size={24} />
          </div>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest opacity-30"
            >
              Fundación
            </p>
            <p className="text-xl font-black">{fundacion}</p>
          </div>
        </div>
        <div
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 group hover:-translate-y-1 transition-transform"
        >
          <div
            className="p-4 bg-primary-green/5 rounded-2xl text-primary-green group-hover:bg-primary-green group-hover:text-hunter transition-colors"
          >
            <Users size={24} />
          </div>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest opacity-30"
            >
              Militantes
            </p>
            <p className="text-xl font-black">{militantes}</p>
          </div>
        </div>
        <div
          className="bg-white p-8 rounded-[3rem] shadow-2xl shadow-primary-green/5 border border-primary-green/5 flex items-center gap-6 group hover:-translate-y-1 transition-transform"
        >
          <div
            className="p-4 bg-primary-green/5 rounded-2xl text-primary-green group-hover:bg-primary-green group-hover:text-hunter transition-colors"
          >
            <BarChart3 size={24} />
          </div>
          <div>
            <p
              className="text-[10px] font-black uppercase tracking-widest opacity-30"
            >
              Tipo de Organización
            </p>
            <p className="text-xl font-black" style={{ textWrap: "balance" }}>{tipo_organizacion}</p>
          </div>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10"
      >
        <div className="lg:col-span-8 space-y-8">
          <div
            className="bg-white p-12 rounded-[4rem] shadow-xl border border-primary-green/5"
          >
            <div className="flex items-center gap-4 mb-12">
              <div
                className="p-4 bg-primary-green text-hunter rounded-2xl"
              >
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight">
                  Liderazgo Central
                </h3>
                <p
                  className="text-[10px] font-bold opacity-30 uppercase tracking-[0.3em]"
                >
                  Cargos directivos y fundadores registrados
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href={linkLider}
                className="group p-8 bg-primary-green/5 rounded-[3rem] border border-transparent hover:border-primary-green hover:bg-white transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className="flex items-center gap-3 mb-6 text-primary-green/40"
                  >
                    <User size={18} />
                    <span
                      className="text-[10px] font-black uppercase tracking-widest"
                    >Representante</span>
                  </div>
                  <h4
                    className="text-2xl font-black mb-6 group-hover:text-primary-green"
                  >
                    {presidenteName}
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span
                    className="text-[10px] font-black bg-hunter px-3 py-1 rounded-lg border border-primary-green/10 uppercase tracking-widest"
                  >Ver Perfil</span>
                  <ArrowUpRight
                    size={16}
                    className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all"
                  />
                </div>
              </a>

              <div
                className="p-8 bg-primary-green text-hunter rounded-[3rem] flex flex-col justify-center relative overflow-hidden"
              >
                <Landmark
                  size={80}
                  className="absolute -right-6 -bottom-6 opacity-5"
                />
                <h4 className="text-xl font-black mb-2 italic">
                  Presidencial
                </h4>
                <p className="text-xs font-medium opacity-50">
                  Representante principal del {sigla} para el
                  proceso electoral 2026.
                </p>
              </div>
            </div>
          </div>

          <div
            className="bg-white p-12 rounded-[4rem] shadow-xl border border-primary-green/5"
          >
            <div className="flex items-center gap-4 mb-10">
              <div
                className="p-4 bg-primary-green/5 rounded-2xl text-primary-green"
              >
                <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight">
                Sede Central
              </h3>
            </div>
            <div
              className="p-8 bg-neutral-white border-2 border-dashed border-primary-green/10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 group hover:border-primary-green/30 transition-colors"
            >
              <div
                className="w-16 h-16 bg-primary-green rounded-2xl flex items-center justify-center text-hunter shadow-lg shrink-0 group-hover:rotate-6 transition-transform"
              >
                <Globe size={24} />
              </div>
              <div className="text-center md:text-left">
                <p
                  className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-1"
                >
                  Dirección Registrada
                </p>
                <p
                  className="text-lg font-bold text-primary-green leading-relaxed italic"
                >
                  {sede}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div
            className="bg-hunter p-10 rounded-[3.5rem] border border-primary-green/10 shadow-sm relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="opacity-30" />
                <h4
                  className="font-black text-[10px] uppercase tracking-[0.3em] opacity-30"
                >
                  Registro de Auditoría
                </h4>
              </div>

              <div className="space-y-6">
                <div>
                  <p
                    className="text-[9px] font-black opacity-30 uppercase mb-1"
                  >
                    ID de Entidad
                  </p>
                  <p
                    className="text-xs font-mono font-bold break-all opacity-60"
                  >
                    {idGrafo}
                  </p>
                </div>
                <div
                  className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-primary-green/5"
                >
                  <div
                    className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse"
                  >
                  </div>
                  <div>
                    <p
                      className="text-[9px] font-black opacity-30 uppercase"
                    >
                      Estatus OEP
                    </p>
                    <p
                      className="text-xs font-bold uppercase tracking-tighter"
                    >
                      Personería Jurídica Vigente
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Award
              className="absolute -right-8 -bottom-8 w-40 h-40 opacity-[0.03]"
            />
          </div>

          <div
            className="bg-primary-green text-hunter p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group"
          >
            <h4
              className="text-2xl font-black tracking-tighter mb-4 relative z-10"
            >
              Vigilancia Electoral
            </h4>
            <p
              className="text-xs font-medium opacity-50 mb-8 relative z-10 leading-relaxed text-pretty"
            >
              Consulta los reportes de financiamiento y declaraciones públicas del {sigla} en nuestro repositorio de datos abiertos.
            </p>
            <button
              className="w-full py-5 bg-hunter text-primary-green rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/20 relative z-10"
            >
              Consultar Transparencia
            </button>
            <Landmark
              className="absolute -right-10 -bottom-10 w-44 h-44 opacity-5 group-hover:rotate-12 transition-transform duration-1000"
            />
          </div>
        </aside>
      </div>
    </main>
  );
}