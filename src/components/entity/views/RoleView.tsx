import { Globe, ListFilter, Landmark, Users, Info } from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { buildPath } from '@/lib/utils/paths';
import { CandidateList } from './CandidateList';

const EMPTY_CLAIMS: Claim[] = [];

interface RoleProps {
  entity: Entity;
  claims: Claim[];
}

export function RoleView({ entity, claims = EMPTY_CLAIMS }: RoleProps) {
  const titulo = entity.label || 'Cargo';
  const descripcion =
    entity.description ||
    'Responsable de la gestión administrativa y fiscalización.';
  const instanciaDe = entity.aliases?.[0] || 'Cargo Político';

  const jurisdictionClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('jurisdiccion') ||
      prop.includes('jurisdicción') ||
      prop.includes('alcance') ||
      prop.includes('cobertura')
    );
  });
  const alcance =
    jurisdictionClaim?.value_relation?.label ||
    jurisdictionClaim?.value_raw ||
    'Nacional';

  const eventClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('evento') ||
      prop.includes('eleccion') ||
      prop.includes('elección')
    );
  });
  const proximoEvento =
    eventClaim?.value_relation?.label ||
    eventClaim?.value_raw ||
    'Subnacionales 2026';

  const holderClaims = claims.filter((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('titular') ||
      prop.includes('persona') ||
      prop.includes('ocupa') ||
      prop.includes('ejerce') ||
      prop.includes('candidato')
    );
  });

  const candidatos = holderClaims
    .map((c) => {
      const roleId = entity.$id;
      const outRelationId =
        typeof c.value_relation === 'object'
          ? c.value_relation?.$id
          : c.value_relation;

      const isIncoming = outRelationId === roleId;
      const candidateEntity = isIncoming ? c.subject : c.value_relation;

      return {
        nombre: candidateEntity?.label || 'Desconocido',
        partido: 'Candidato Político',
        link: candidateEntity?.$id
          ? buildPath(`/entity?id=${candidateEntity.$id}`)
          : '#',
      };
    })
    .filter((c) => c.nombre !== 'Desconocido' && c.nombre !== titulo);

  const totalRegistrados = candidatos.length > 0 ? candidatos.length : 'N/D';

  const modificado = entity.$updatedAt
    ? new Date(entity.$updatedAt).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
    : 'N/D';

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      <section className="bg-white border-b border-slate-200 pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row gap-10 items-center md:items-end">
            <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-500 shadow-sm rotate-3 border border-slate-200 shrink-0">
              <Landmark size={40} strokeWidth={2.5} />
            </div>

            <div className="flex-1 text-center md:text-left text-slate-900">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full border border-slate-200 mb-4">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  {instanciaDe}
                </span>
              </div>
              <h1
                className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] mb-6"
                style={{ textWrap: 'balance' }}
              >
                {titulo}
              </h1>
              <p className="text-lg md:text-xl text-slate-500 font-medium max-w-2xl text-pretty leading-relaxed mx-auto md:mx-0">
                {descripcion}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <Users size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Candidatos Identificados
            </p>
            <p className="text-2xl font-black text-slate-800">
              {totalRegistrados}
              {typeof totalRegistrados === 'number' ? '+' : ''}
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <Globe size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Alcance
            </p>
            <p className="text-2xl font-black text-primary-green">{alcance}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex items-center gap-5">
          <div className="p-3 bg-slate-100 rounded-xl text-slate-500">
            <ListFilter size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Próximo Evento
            </p>
            <p className="text-2xl font-black text-slate-800">
              {proximoEvento}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-8">
          <CandidateList candidatos={candidatos} titulo={titulo} />
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Marco Jurídico
                </h4>
              </div>
              <p className="text-sm font-bold text-slate-300 leading-relaxed text-pretty">
                En el sistema electoral boliviano, el{' '}
                <span className="text-white">{titulo}</span> ejerce funciones
                ejecutivas de acuerdo con la Constitución Política del Estado.
              </p>
            </div>
          </div>

          <div className="bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <h4
              className="text-2xl font-black tracking-tighter text-slate-800 mb-6 relative z-10"
              style={{ textWrap: 'balance' }}
            >
              Auditoría de Entidades
            </h4>
            <div className="space-y-4 relative z-10">
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  ID Único de Cargo
                </p>
                <p className="text-xs font-mono font-bold break-all text-slate-800">
                  {entity.$id}
                </p>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                <span>Modificado: {modificado}</span>
              </div>
            </div>
            <Landmark className="absolute -right-12 -bottom-12 w-48 h-48 opacity-5 text-slate-400 group-hover:scale-110 transition-transform duration-1000" />
          </div>
        </aside>
      </div>
      <style>{`
                main {
                    -webkit-font-smoothing: antialiased;
                    text-rendering: optimizeLegibility;
                }
            `}</style>
    </main>
  );
}
