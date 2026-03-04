import React from 'react';
import type { EntityDetailProps } from './types';
import { useProcessedData } from './hooks/useProcessedData';
import { usePartyLogo } from './hooks/usePartyLogo';
import { normalizeText } from './utils/formatters';
import { getSigla } from './utils/formatters';
import {
  getQualifierEntity,
  getQualifierValueByLabels,
  getEntityId,
  extractLabel,
} from './utils/claimHelpers';
import { HeroSection } from './components/HeroSection';
import { TrayectoriaSection } from './components/TrayectoriaSection';
import { EducacionSection } from './components/EducacionSection';
import { EncuestasSection } from './components/EncuestasSection';
import { VinculosSection } from './components/VinculosSection';
import { SocialLinksCard } from './components/SocialLinksCard';
import { PartyCard } from './components/PartyCard';
import { JurisdiccionCard } from './components/JurisdiccionCard';

export const EntityDetail: React.FC<EntityDetailProps> = ({
  entity,
  claims,
}) => {
  const processedData = useProcessedData(claims, entity);

  const {
    trayectoriaItems,
    educacionItems,
    encuestasItems,
    vinculosItems,
    partido,
    lugarNacimiento,
    lugarNacimientoId,
    socialLinks,
    perfil,
  } = processedData;

  const candidateClaim = (claims || []).find((claim) =>
    normalizeText(extractLabel(claim.property)).includes('candidato politico')
  );
  const partyQualifierEntity = candidateClaim
    ? getQualifierEntity(candidateClaim, 'partido/movimiento politico')
    : null;
  const partyQualifierRole = candidateClaim
    ? getQualifierValueByLabels(candidateClaim, ['rol', 'titular', 'cargo']) ||
    null
    : null;

  const partyLogo =
    (claims || []).find((c) => {
      const propLabel = normalizeText(extractLabel(c.property));
      return (
        c.datatype === 'image' &&
        (propLabel.includes('logo') ||
          propLabel.includes('emblema') ||
          propLabel.includes('organizacion'))
      );
    })?.value_raw || partido.find((c) => c.datatype === 'image')?.value_raw;

  const mainParty = partyQualifierEntity
    ? {
      id: getEntityId(partyQualifierEntity),
      nombre: extractLabel(partyQualifierEntity),
      sigla: getSigla(extractLabel(partyQualifierEntity)),
      rol: partyQualifierRole || 'Miembro',
      logo: partyLogo || null,
    }
    : partido.length > 0
      ? {
        id: getEntityId(partido[0].value_relation),
        nombre: extractLabel(
          partido[0].value_relation || partido[0].value_raw
        ),
        sigla: getSigla(
          extractLabel(partido[0].value_relation || partido[0].value_raw)
        ),
        rol: extractLabel(partido[0].property) || 'Miembro',
        logo: partyLogo || null,
      }
      : null;

  const fetchedLogo = usePartyLogo(mainParty?.id || undefined, partyLogo);
  const mainPartyWithLogo = mainParty
    ? { ...mainParty, logo: mainParty.logo || fetchedLogo }
    : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased pb-24">
      <style>{`main{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}h1,h2,h3,h4,h5{text-wrap:balance}.animate-slide-up{animation:slideUp 0.8s cubic-bezier(0.16,1,0.3,1) forwards;opacity:0}@keyframes slideUp{from{transform:translateY(30px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      <HeroSection
        entityLabel={entity.label || ''}
        perfil={perfil}
        lugarNacimiento={lugarNacimiento}
        lugarNacimientoId={lugarNacimientoId}
        claims={claims}
        mainParty={mainPartyWithLogo}
      />

      <div className="max-w-6xl mx-auto px-6 -mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10 relative z-20">
        <div className="lg:col-span-8 space-y-8 animate-slide-up">
          <TrayectoriaSection trayectoriaItems={trayectoriaItems} />
          <EducacionSection educacionItems={educacionItems} />
          <EncuestasSection encuestasItems={encuestasItems} />
          <VinculosSection vinculosItems={vinculosItems} />
        </div>

        <aside
          className="lg:col-span-4 space-y-8 animate-slide-up"
          style={{ animationDelay: '0.2s' }}
        >
          <SocialLinksCard socialLinks={socialLinks} />
          <PartyCard mainParty={mainPartyWithLogo} />
          <JurisdiccionCard lugarNacimiento={lugarNacimiento} />
        </aside>
      </div>
    </div>
  );
};
