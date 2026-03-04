import React, { Suspense, lazy } from 'react';
import type { Entity, Claim } from '@/lib/queries/types';
import type { EntityType } from '@/lib/appwrite/entity-utils';

const TerritoryView = lazy(() =>
  import('./TerritoryView').then((m) => ({ default: m.TerritoryView }))
);
const InstitutionView = lazy(() =>
  import('./InstitutionView').then((m) => ({ default: m.InstitutionView }))
);
const PartyView = lazy(() =>
  import('./PartyView').then((m) => ({ default: m.PartyView }))
);
const SurveyView = lazy(() =>
  import('./SurveyView').then((m) => ({ default: m.SurveyView }))
);
const PollingFirmView = lazy(() =>
  import('./PollingFirmView').then((m) => ({ default: m.PollingFirmView }))
);
const EducationView = lazy(() =>
  import('./EducationView').then((m) => ({ default: m.EducationView }))
);
const RoleView = lazy(() =>
  import('./RoleView').then((m) => ({ default: m.RoleView }))
);
const EntityDetail = lazy(() =>
  import('../EntityDetail').then((m) => ({ default: m.EntityDetail }))
);

interface EntityRendererProps {
  entity: Entity;
  claims: Claim[];
  type: EntityType;
}

export function EntityRenderer({ entity, claims, type }: EntityRendererProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center">
          <p className="text-slate-400 animate-pulse font-medium">
            Cargando vista...
          </p>
        </div>
      }
    >
      {(() => {
        switch (type) {
          case 'TERRITORIO':
            return <TerritoryView entity={entity} claims={claims} />;
          case 'INSTITUCION':
            return <InstitutionView entity={entity} claims={claims} />;
          case 'PARTIDO_POLITICO':
            return <PartyView entity={entity} claims={claims} />;
          case 'ENCUESTA':
            return <SurveyView entity={entity} claims={claims} />;
          case 'CASA_ENCUESTADORA':
            return <PollingFirmView entity={entity} claims={claims} />;
          case 'EDUCACION':
            return <EducationView entity={entity} claims={claims} />;
          case 'ROL':
            return <RoleView entity={entity} claims={claims} />;
          case 'POLITICO':
          case 'PERSONA':
            return <EntityDetail entity={entity} claims={claims} />;
          default:
            return <EntityDetail entity={entity} claims={claims} />;
        }
      })()}
    </Suspense>
  );
}
