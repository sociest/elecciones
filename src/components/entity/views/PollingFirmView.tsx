import React from 'react';
import {
  BarChart3,
  Facebook,
  Youtube,
  Mail,
  ShieldCheck,
  Info,
  ChevronRight,
  Globe,
  History,
  Fingerprint,
  Share2,
} from 'lucide-react';
import type { Entity, Claim } from '@/lib/queries/types';
import { buildPath } from '@/lib/utils/paths';

const EMPTY_CLAIMS: Claim[] = [];

interface PollingFirmProps {
  entity: Entity;
  claims: Claim[];
}

export function PollingFirmView({
  entity,
  claims = EMPTY_CLAIMS,
}: PollingFirmProps) {
  const normalizeText = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const extractLabel = (val: unknown): string => {
    if (typeof val === 'string') return val;
    if (val && typeof val === 'object' && 'label' in val) {
      return String((val as { label: unknown }).label);
    }
    return String(val || 'No especificado');
  };

  const nombreOficial = entity.label || 'Desconocido';
  const aliasesArray = entity.aliases || [];
  const alias = aliasesArray.length > 0 ? aliasesArray[0] : nombreOficial;

  const tipo = 'Casa Encuestadora';

  const identificador = entity.$id;
  const dateOptions: Intl.DateTimeFormatOptions = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  };
  const actualizacion = entity.$updatedAt
    ? new Date(entity.$updatedAt).toLocaleDateString('es-BO', dateOptions)
    : 'N/D';

  const emailClaim = claims.find(
    (c) =>
      normalizeText(extractLabel(c.property)).includes('correo') ||
      normalizeText(extractLabel(c.property)).includes('email')
  );
  const email = emailClaim ? extractLabel(emailClaim.value_raw) : null;

  const socialLinks: { type: string; url: string }[] = [];
  claims.forEach((c) => {
    const propLower = c.property?.label?.toLowerCase() || '';
    const val = c.value_raw || '';
    if (
      c.datatype === 'url' ||
      propLower.includes('url') ||
      propLower.includes('red social') ||
      propLower.includes('sitio web') ||
      propLower.includes('contacto')
    ) {
      const urlLower = val.toLowerCase();
      if (urlLower.includes('facebook'))
        socialLinks.push({ type: 'facebook', url: val });
      else if (urlLower.includes('twitter') || urlLower.includes('x.com'))
        socialLinks.push({ type: 'twitter', url: val });
      else if (urlLower.includes('instagram'))
        socialLinks.push({ type: 'instagram', url: val });
      else if (urlLower.includes('linkedin'))
        socialLinks.push({ type: 'linkedin', url: val });
      else if (urlLower.includes('youtube'))
        socialLinks.push({ type: 'youtube', url: val });
      else socialLinks.push({ type: 'web', url: val });
    }
  });

  const facebookLink = socialLinks.find((link) => link.type === 'facebook');
  const youtubeLink = socialLinks.find((link) => link.type === 'youtube');

  const alianzas = claims
    .filter(
      (c) =>
        c.value_relation &&
        (normalizeText(extractLabel(c.property)).includes('alianza') ||
          normalizeText(extractLabel(c.property)).includes('miembro'))
    )
    .map((c) => ({
      nombre: extractLabel(c.value_relation),
      relacion: extractLabel(c.property),
    }));

  const ubicacionClaim = claims.find(
    (c) =>
      normalizeText(extractLabel(c.property)).includes('ubicacion') ||
      normalizeText(extractLabel(c.property)).includes('sede') ||
      normalizeText(extractLabel(c.property)).includes('territorio')
  );
  const ubicacion = ubicacionClaim
    ? extractLabel(ubicacionClaim.value_relation || ubicacionClaim.value_raw)
    : 'Sede Principal';

  const encuestas = claims
    .filter((c) => {
      const prop = normalizeText(extractLabel(c.property));
      return (
        prop.includes('encuesta') ||
        prop.includes('estudio') ||
        prop.includes('resultado') ||
        normalizeText(extractLabel(c.value_relation)).includes('encuesta')
      );
    })
    .map((c) => ({
      id: c.$id,
      nombre: extractLabel(c.value_relation || c.value_raw || c.property),
      link: c.value_relation?.$id
        ? buildPath(`/entity?id=${c.value_relation.$id}`)
        : null,
      fecha:
        extractLabel(
          c.qualifiers?.find((q) =>
            normalizeText(extractLabel(q.property)).includes('fecha')
          )?.value_raw
        ) || 'Reciente',
    }));

  const getAbbreviation = (name: string) => {
    const words = name.split(' ').filter((w) => w.length > 2);
    if (words.length >= 2)
      return (
        words[0].substring(0, 1).toUpperCase() +
        words[1].substring(0, 1).toUpperCase()
      );
    return name.substring(0, 2).toUpperCase();
  };
  const abbreviation = getAbbreviation(alias);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24 animate-[fadeInUp_0.8s_cubic-bezier(0.16,1,0.3,1)_forwards]">
      <section className="bg-white border-b border-slate-200 pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>

        <div className="max-w-6xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="mb-10 relative group">
            <div className="w-44 h-44 bg-slate-800 rounded-[3rem] flex items-center justify-center shadow-sm p-6 border-4 border-slate-100 group-hover:rotate-2 transition-transform duration-700">
              <div className="text-white font-black leading-none text-center">
                <p className="text-[10px] uppercase tracking-widest text-slate-400 mb-1">
                  Perfil
                </p>
                <p className="text-4xl tracking-tighter truncate max-w-30">
                  {abbreviation}
                </p>
                <p className="text-[8px] uppercase font-bold mt-1 text-slate-400 truncate max-w-30">
                  {ubicacion}
                </p>
              </div>
            </div>
            <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2.5 rounded-2xl shadow-sm ring-4 ring-white">
              <ShieldCheck size={20} strokeWidth={3} />
            </div>
          </div>

          <div className="max-w-4xl space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 rounded-full border border-slate-200">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-pulse"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
                {tipo}
              </span>
            </div>
            <h1 className="text-5xl md:text-8xl font-black text-slate-900 tracking-tighter leading-[0.85] mb-6 drop-shadow-sm wrap-break-words">
              {alias}
            </h1>
            <p className="text-xl text-slate-500 font-bold italic">
              {nombreOficial}
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6 -mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-20">
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-slate-100 rounded-2xl text-slate-500">
            <Mail size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Correo Electrónico
            </p>
            <p className="text-sm font-black truncate max-w-37.5 text-slate-800">
              {email || 'No registrado'}
            </p>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-[#1877F2]/10 text-[#1877F2] rounded-2xl">
            <Facebook size={24} fill="currentColor" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Facebook
            </p>
            {facebookLink ? (
              <a
                href={facebookLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-slate-800 hover:text-primary-green hover:underline"
              >
                Ver Perfil Oficial
              </a>
            ) : (
              <p className="text-sm font-black text-slate-400">No registrado</p>
            )}
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-200 flex items-center gap-6">
          <div className="p-4 bg-[#FF0000]/10 text-[#FF0000] rounded-2xl">
            <Youtube size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Línea web
            </p>
            {youtubeLink || socialLinks.length > 0 ? (
              <a
                href={(youtubeLink || socialLinks[0]).url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-black text-slate-800 hover:text-primary-green hover:underline truncate inline-block max-w-37.5"
              >
                {(youtubeLink || socialLinks[0]).url.replace(
                  /^https?:\/\//,
                  ''
                )}
              </a>
            ) : (
              <p className="text-sm font-black text-slate-400">No registrado</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-8 space-y-10">
          <div className="flex items-center gap-4 border-b border-slate-200 pb-8">
            <div className="p-4 bg-slate-100 text-slate-600 rounded-2xl shadow-sm">
              <BarChart3 size={24} />
            </div>
            <div>
              <h3 className="text-4xl font-black tracking-tight text-slate-800">
                Estudios Realizados
              </h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
                Encuestas registradas bajo esta firma
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {encuestas.length > 0 ? (
              encuestas.map((e) => (
                <a
                  key={e.id}
                  href={e.link || '#'}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-8 bg-slate-50 border border-slate-200/50 hover:bg-white rounded-[3rem] hover:border-slate-300 transition-all hover:shadow-sm"
                >
                  <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 group-hover:bg-primary-green group-hover:text-white group-hover:border-primary-green transition-colors shrink-0 shadow-sm">
                      <Globe size={20} />
                    </div>
                    <h4 className="text-lg font-black leading-tight line-clamp-2 text-slate-800 group-hover:text-primary-green transition-colors">
                      {e.nombre}
                    </h4>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 mt-4 md:mt-0">
                    <span className="text-[11px] font-black bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200 text-slate-500">
                      {e.fecha}
                    </span>
                    <ChevronRight className="text-slate-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-primary-green transition-all" />
                  </div>
                </a>
              ))
            ) : (
              <div className="text-center py-12 px-6 bg-slate-50 rounded-[3rem] border border-dashed border-slate-200 text-slate-400">
                <Globe size={48} className="mx-auto mb-4 opacity-50" />
                <p className="font-bold text-sm tracking-widest uppercase">
                  No se registraron estudios asociados aún.
                </p>
              </div>
            )}
          </div>
        </div>

        <aside className="lg:col-span-4 space-y-8">
          <div className="bg-slate-900 p-10 rounded-[4rem] border border-slate-800 shadow-xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <Info size={18} className="text-slate-400" />
                <h4 className="font-black text-[10px] uppercase tracking-[0.3em] text-slate-400">
                  Datos del Registro
                </h4>
              </div>

              <div className="space-y-8">
                <div>
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-2">
                    Código de Identificación
                  </p>
                  <p className="text-xs font-mono font-bold break-all text-slate-300 leading-relaxed">
                    {identificador}
                  </p>
                </div>

                <div className="space-y-4 pt-6 border-t border-slate-800">
                  <div className="flex items-center gap-4">
                    <History size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[8px] font-black text-slate-500 uppercase">
                        Última Actualización
                      </p>
                      <p className="text-xs font-bold text-slate-200">{actualizacion}</p>
                    </div>
                  </div>
                  {alianzas.length > 0 && (
                    <div className="flex items-center gap-4">
                      <Share2 size={16} className="text-slate-400" />
                      <div>
                        <p className="text-[8px] font-black text-slate-500 uppercase">
                          {alianzas[0].relacion}
                        </p>
                        <p className="text-xs font-bold text-slate-200 line-clamp-1">
                          {alianzas[0].nombre}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <Fingerprint className="absolute -right-12 -bottom-12 w-48 h-48 opacity-10 text-slate-400 group-hover:rotate-12 transition-transform duration-1000" />
          </div>

          <div className="bg-white border border-slate-200 p-10 rounded-[4rem] shadow-sm relative overflow-hidden group">
            <h4 className="text-2xl font-black tracking-tighter text-slate-800 mb-4 relative z-10">
              Auditoría Electoral
            </h4>
            <p className="text-xs font-medium text-slate-500 mb-10 relative z-10 leading-relaxed text-pretty">
              Monitor 2026 registra los vínculos institucionales para asegurar
              que cada encuesta tenga una fuente verificable.
            </p>
            <div className="w-full py-5 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-sm border border-slate-200">
              Fuente Verificada
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
