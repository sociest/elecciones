import {
  Users,
  ArrowUpRight,
  Calendar,
  MapPin,
  Landmark,
  ShieldCheck,
  Info,
  Fingerprint,
  Award,
  BarChart3,
  Globe,
  User,
} from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { buildPath } from '@/lib/utils/paths';
import { getOptimizedImageUrl } from '@/lib/utils/image';

const EMPTY_CLAIMS: Claim[] = [];

interface PartyProps {
  entity: Entity;
  claims: Claim[];
}

export function PartyView({ entity, claims = EMPTY_CLAIMS }: PartyProps) {
  const nombre = entity.label || 'Partido Político';
  const sigla = entity.aliases?.[0] || 'PP';
  const tipo = 'Partido Político';
  const bgDescription =
    entity.description ||
    'Agrupación política con participación a nivel nacional registrada en el OEP.';

  const foundationClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('fundación') ||
      prop.includes('fundacion') ||
      prop.includes('fecha')
    );
  });
  const fundacion = foundationClaim?.value_raw || 'Desconocida';

  const militantsClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('militante') ||
      prop.includes('afiliado') ||
      prop.includes('miembro')
    );
  });
  const militantes = militantsClaim?.value_raw || 'No registrado';

  const ideologyClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('ideologia') ||
      prop.includes('ideología') ||
      prop.includes('espectro')
    );
  });
  const espectro =
    ideologyClaim?.value_relation?.label ||
    ideologyClaim?.value_raw ||
    'No definido';

  const addressClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('sede') ||
      prop.includes('dirección') ||
      prop.includes('direccion')
    );
  });
  const sede = addressClaim?.value_raw || 'Sede principal no registrada';

  const colorClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return prop.includes('color');
  });
  const colorRaw = colorClaim?.value_raw;
  let colors = ['#14281d', '#2d4a3e'];
  if (colorRaw) {
    if (colorRaw.includes(',')) {
      colors = colorRaw.split(',').map((c) => c.trim());
    } else {
      colors = [colorRaw, colorRaw];
    }
  }

  const leaderClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('presidente') ||
      prop.includes('líder') ||
      prop.includes('lider')
    );
  });

  const logoClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return (
      prop.includes('logo') ||
      prop.includes('imagen') ||
      prop.includes('escudo')
    );
  });
  const logoUrl = logoClaim?.value_raw;

  const candidateClaim = claims.find((c) => {
    const prop = c.property?.label?.toLowerCase() || '';
    return prop.includes('candidato') || prop.includes('presidencial');
  });

  const presidenteInfo = leaderClaim || candidateClaim;
  const presidenteName =
    presidenteInfo?.value_relation?.label ||
    presidenteInfo?.value_raw ||
    'Directiva';
  const idPresidente =
    typeof presidenteInfo?.value_relation === 'object'
      ? presidenteInfo?.value_relation?.$id
      : presidenteInfo?.value_relation;
  const linkLider = idPresidente
    ? buildPath(`/entity?id=${idPresidente}`)
    : '#';

  const idGrafo = entity.$id;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10 text-center flex flex-col items-center">
          <div className="mb-8 relative group">
            <div
              className={`w-36 h-36 rounded-[3rem] flex items-center justify-center shadow-2xl transition-transform duration-700 overflow-hidden relative ${!logoUrl ? 'rotate-3 group-hover:rotate-0 border-4 border-white/10' : ''}`}
              style={
                !logoUrl
                  ? {
                    background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`,
                  }
                  : {}
              }
            >
              {logoUrl && (
                <>
                  <div
                    className="absolute inset-0 opacity-50"
                    style={{
                      background: `linear-gradient(135deg, ${colors[0]}, ${colors[colors.length - 1]})`,
                    }}
                  />
                  <div className="absolute inset-1 bg-primary-green rounded-[2.8rem] z-0" />
                </>
              )}

              {logoUrl ? (
                <img
                  src={getOptimizedImageUrl(logoUrl, 600)}
                  alt={`Logo de ${nombre}`}
                  width={600}
                  height={600}
                  className="w-full h-full object-contain p-4 drop-shadow-md relative z-10"
                />
              ) : (
                <span className="text-4xl font-black text-white drop-shadow-md relative z-10">
                  {sigla}
                </span>
              )}
            </div>
            <div
              className={`absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-xl ring-4 ring-white z-20`}
            >
              <ShieldCheck size={20} strokeWidth={3} />
            </div>
          </div>

          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {tipo}
              </span>
            </div>
            <h1
              className="text-6xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] mb-6"
              style={{ textWrap: 'balance' }}
            >
              {nombre}
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed text-pretty">
              {bgDescription}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/80 flex items-center gap-6 group hover:-translate-y-1 transition-transform">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 group-hover:bg-primary-green group-hover:text-hunter transition-colors">
            <Calendar size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Fundación
            </p>
            <p className="text-xl font-black text-slate-800">{fundacion}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/80 flex items-center gap-6 group hover:-translate-y-1 transition-transform">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 group-hover:bg-primary-green group-hover:text-hunter transition-colors">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Militantes
            </p>
            <p className="text-xl font-black text-slate-800">{militantes}</p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200/80 flex items-center gap-6 group hover:-translate-y-1 transition-transform">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500 group-hover:bg-primary-green group-hover:text-hunter transition-colors">
            <BarChart3 size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Ideología
            </p>
            <p className="text-xl font-black text-slate-800" style={{ textWrap: 'balance' }}>
              {espectro}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-16 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-12">
              <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl">
                <Fingerprint size={24} />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tight text-slate-800">
                  Liderazgo Central
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                  Cargos directivos y fundadores registrados
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <a
                href={linkLider}
                className="group p-8 bg-slate-50 rounded-[3rem] border border-slate-200/50 hover:border-slate-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-6 text-slate-500">
                    <User size={18} />
                    <span className="text-[10px] font-black uppercase tracking-widest">
                      Representante
                    </span>
                  </div>
                  <h4 className="text-2xl font-black mb-6 text-slate-800 group-hover:text-primary-green transition-colors">
                    {presidenteName}
                  </h4>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black bg-white text-slate-600 px-3 py-1 rounded-lg border border-slate-200 uppercase tracking-widest transition-colors group-hover:bg-primary-green/10 group-hover:border-primary-green/20 group-hover:text-primary-green">
                    Ver Perfil
                  </span>
                  <ArrowUpRight
                    size={16}
                    className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all group-hover:text-primary-green"
                  />
                </div>
              </a>

              <div className="p-8 bg-slate-800 text-white rounded-[3rem] flex flex-col justify-center relative overflow-hidden border border-slate-700">
                <Landmark
                  size={80}
                  className="absolute -right-6 -bottom-6 opacity-10"
                />
                <h4 className="text-xl font-black mb-2 italic">Presidencial</h4>
                <p className="text-xs font-medium text-slate-300">
                  Representante principal del {sigla} para el proceso electoral
                  2026.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-200">
            <div className="flex items-center gap-4 mb-10">
              <div className="p-4 bg-slate-100 rounded-2xl text-slate-600">
                <MapPin size={24} />
              </div>
              <h3 className="text-2xl font-black tracking-tight text-slate-800">
                Sede Central
              </h3>
            </div>
            <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200/80 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 group hover:border-slate-300 transition-colors">
              <div className="w-16 h-16 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-500 shadow-sm shrink-0 group-hover:rotate-6 transition-transform">
                <Globe size={24} />
              </div>
              <div className="text-center md:text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">
                  Dirección Registrada
                </p>
                <p className="text-lg font-bold text-slate-700 leading-relaxed italic">
                  {sede}
                </p>
              </div>
            </div>
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[3.5rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Registro de Auditoría
                </h4>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-1">
                    ID de Entidad
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-slate-300">
                    {idGrafo}
                  </p>
                </div>
                <div className="flex items-start gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 animate-pulse shrink-0"></div>
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase">
                      Estatus OEP
                    </p>
                    <p className="text-xs font-bold uppercase tracking-tighter text-slate-200">
                      Personería Jurídica Vigente
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Award className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 text-slate-400 group-hover:text-primary-green transition-colors duration-700" />
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[3.5rem] shadow-sm relative overflow-hidden group">
            <h4 className="text-2xl font-black tracking-tighter text-slate-800 mb-4 relative z-10">
              Vigilancia Electoral
            </h4>
            <p className="text-xs font-medium text-slate-500 mb-8 relative z-10 leading-relaxed text-pretty">
              Consulta los reportes de financiamiento y declaraciones públicas
              del {sigla} en nuestro repositorio de datos abiertos.
            </p>
            <button className="w-full py-5 px-8 bg-slate-100 border border-slate-200 text-slate-700 hover:text-white hover:bg-slate-800 hover:border-slate-800 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] active:scale-95 transition-all shadow-sm relative z-10">
              Consultar Transparencia
            </button>
            <Landmark className="absolute -right-10 -bottom-10 w-44 h-44 opacity-5 text-slate-400 group-hover:scale-110 group-hover:text-primary-green transition-all duration-1000" />
          </div>
        </aside>
      </div>
    </main>
  );
}
