import {
  MapPin,
  BarChart3,
  Users,
  ChevronRight,
  ArrowUpRight,
  ShieldCheck,
  Info,
  Calendar,
  Building,
  DollarSign,
  Globe,
} from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { buildPath } from '@/lib/utils/paths';

const EMPTY_CLAIMS: Claim[] = [];

interface InstitutionProps {
  entity: Entity;
  claims: Claim[];
}

export function InstitutionView({
  entity,
  claims = EMPTY_CLAIMS,
}: InstitutionProps) {
  const nombre = entity.label || 'Institución';
  const descripcion =
    entity.description ||
    'Entidad u organismo que forma parte de la estructura institucional.';
  const categoria = entity.aliases?.[0] || 'INSTITUCIÓN';

  const jurisdictionClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('jurisdiccion') ||
      prop.includes('jurisdicción') ||
      prop.includes('alcance') ||
      prop.includes('cobertura')
    );
  });
  const jurisdiccion =
    jurisdictionClaim?.value_relation?.label ||
    jurisdictionClaim?.value_raw ||
    'Nacional';

  const budgetClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('presupuesto') ||
      prop.includes('gasto') ||
      prop.includes('financ')
    );
  });
  const presupuesto = budgetClaim?.value_raw || 'N/D';

  const partOfClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('parte de') ||
      prop.includes('depende de') ||
      prop.includes('pertenece')
    );
  });
  const dependencia =
    partOfClaim?.value_relation?.label ||
    partOfClaim?.value_raw ||
    'Gobierno de Bolivia';
  const dependenciaId = partOfClaim?.value_relation?.$id;

  const headClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('director') ||
      prop.includes('ministro') ||
      prop.includes('jefe') ||
      prop.includes('autoridad') ||
      prop.includes('responsable')
    );
  });
  const headName = headClaim?.value_relation?.label || headClaim?.value_raw;
  const headId = headClaim?.value_relation?.$id;

  const creado = entity.$createdAt
    ? new Date(entity.$createdAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'N/D';

  const modificado = entity.$updatedAt
    ? new Date(entity.$updatedAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : 'N/D';

  const personalRelacionado = [];
  if (headName) {
    personalRelacionado.push({
      nombre: headName,
      cargo: 'Autoridad Principal',
      link: headId ? buildPath(`/entity?id=${headId}`) : '#',
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="mb-8 relative group">
              <div className="w-24 h-24 bg-slate-100 rounded-[2rem] flex items-center justify-center text-slate-700 shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500 border-4 border-white">
                <Building size={40} strokeWidth={2} />
              </div>
              <div className="absolute -bottom-2 -right-2 bg-primary-green text-white p-2 rounded-xl shadow-lg ring-4 ring-white">
                <ShieldCheck size={16} strokeWidth={3} />
              </div>
            </div>

            <div className="max-w-3xl space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  {categoria}
                </span>
              </div>
              <h1
                className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]"
                style={{ textWrap: 'balance' }}
              >
                {nombre}
              </h1>
              <p className="text-lg md:text-xl text-slate-500 font-medium leading-relaxed text-pretty">
                {descripcion}
              </p>
            </div>
          </div>
        </div>
      </section>

      <div
        className="max-w-6xl mx-auto px-6 -mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-20"
        style={{
          animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        }}
      >
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80 flex items-center gap-5">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
            <MapPin size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Jurisdicción
            </p>
            <p className="text-lg font-black text-slate-700">{jurisdiccion}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80 flex items-center gap-5">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
            <DollarSign size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Presupuesto Anual
            </p>
            <p className="text-lg font-black text-slate-700">{presupuesto}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200/80 flex items-center gap-5">
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500">
            <Calendar size={20} />
          </div>
          <div>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">
              Última Modificación
            </p>
            <p className="text-lg font-black text-slate-700">{modificado}</p>
          </div>
        </div>
      </div>

      <div
        className="max-w-6xl mx-auto px-6 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10"
        style={{
          animation: 'slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          animationDelay: '100ms',
          opacity: 0,
          animationFillMode: 'forwards',
        }}
      >
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl">
                <Building size={24} />
              </div>
              <div>
                <h3
                  className="text-2xl font-black tracking-tight text-slate-800"
                  style={{ textWrap: 'balance' }}
                >
                  Jerarquía Institucional
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                  Dependencia administrativa en el grafo estatal
                </p>
              </div>
            </div>

            <a
              href={
                dependenciaId ? buildPath(`/entity?id=${dependenciaId}`) : '#'
              }
              className="group block p-8 rounded-[3rem] bg-slate-50 border border-slate-200 hover:bg-white hover:border-slate-300 hover:shadow-md transition-all duration-500"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-6">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-slate-400 group-hover:text-primary-green transition-colors shadow-sm border border-slate-100">
                    <Globe size={20} />
                  </div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">
                      Entidad Superior
                    </p>
                    <h4 className="text-xl font-black text-slate-700">{dependencia}</h4>
                  </div>
                </div>
                <ArrowUpRight className="text-slate-300 group-hover:text-primary-green transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              </div>
            </a>
          </div>

          <div className="bg-white p-10 rounded-[4rem] shadow-sm border border-slate-200/80">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-slate-50 rounded-2xl text-slate-600">
                <Users size={24} />
              </div>
              <h3
                className="text-2xl font-black tracking-tight text-slate-800"
                style={{ textWrap: 'balance' }}
              >
                Personal Vinculado
              </h3>
            </div>
            <div className="space-y-4">
              {personalRelacionado.length > 0 ? (
                personalRelacionado.map((p) => (
                  <a
                    key={`person-${p.nombre}-${p.cargo}`}
                    href={p.link}
                    className="group flex items-center justify-between p-6 rounded-[2.5rem] bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-500 text-[10px] group-hover:bg-primary-green group-hover:text-white transition-colors">
                        {p.nombre.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-black text-sm leading-tight text-slate-700 text-pretty group-hover:text-slate-900">
                          {p.nombre}
                        </h4>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                          {p.cargo}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-primary-green transition-transform group-hover:translate-x-1" />
                  </a>
                ))
              ) : (
                <p className="text-sm font-medium text-slate-400 text-center py-4">
                  No se encontro personal vinculado directamente.
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Auditoría de Datos
                </h4>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">
                    ID Único de Entidad
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-slate-300">
                    {entity.$id}
                  </p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <Calendar size={16} className="shrink-0 mt-0.5 text-slate-400" />
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Fecha de Registro
                    </p>
                    <p className="text-xs font-bold text-slate-200">{creado}</p>
                  </div>
                </div>
              </div>
            </div>
            <BarChart3 className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 group-hover:rotate-12 transition-transform duration-700 text-slate-400 group-hover:text-primary-green" />
          </div>
        </aside>
      </div>
      <style>{`
                @keyframes slideUp {
                    from {
                        transform: translateY(30px);
                        opacity: 0;
                    }
                    to {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
            `}</style>
    </main>
  );
}
