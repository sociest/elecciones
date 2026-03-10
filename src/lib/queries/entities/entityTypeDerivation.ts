import { ENTITY_TYPE_IDS, PROPERTY_IDS } from '../../constants/entity-types';
import {
  inferEntityTypeFromLabel,
  type EntityType,
} from '../../appwrite/entity-utils';
import type { Claim } from '../types';

/**
 * Derive EntityType from outgoing claims that are already fetched —
 * looks for the 'es instancia de' claim and maps value_relation.$id to EntityType.
 */
export function deriveEntityTypeFromClaims(
  claims: Claim[],
  entityLabel?: string
): EntityType {
  const instanceClaims = claims.filter(
    (c) =>
      (typeof c.property === 'object' ? c.property?.$id : c.property) ===
      PROPERTY_IDS.ES_INSTANCIA_DE
  );

  console.log('[deriveEntityTypeFromClaims]', {
    entityLabel,
    totalClaims: claims.length,
    instanceClaimsCount: instanceClaims.length,
    PROPERTY_IDS_ES_INSTANCIA_DE: PROPERTY_IDS.ES_INSTANCIA_DE,
  });

  for (const instanceClaim of instanceClaims) {
    const typeId =
      typeof instanceClaim.value_relation === 'object'
        ? instanceClaim.value_relation?.$id
        : instanceClaim.value_relation;

    console.log('[deriveEntityTypeFromClaims] Checking instance claim:', {
      typeId,
      value_relation: instanceClaim.value_relation,
      TERRITORIO_IDS: {
        MUNICIPIO: ENTITY_TYPE_IDS.MUNICIPIO,
        DEPARTAMENTO: ENTITY_TYPE_IDS.DEPARTAMENTO,
        TERRITORIO: ENTITY_TYPE_IDS.TERRITORIO,
        ENTIDAD_TERRITORIAL: ENTITY_TYPE_IDS.ENTIDAD_TERRITORIAL,
      },
    });

    if (typeId === ENTITY_TYPE_IDS.POLITICO) return 'POLITICO';
    if (typeId === ENTITY_TYPE_IDS.PERSONA) return 'PERSONA';
    if (
      typeId === ENTITY_TYPE_IDS.MUNICIPIO ||
      typeId === ENTITY_TYPE_IDS.DEPARTAMENTO ||
      typeId === ENTITY_TYPE_IDS.TERRITORIO ||
      typeId === ENTITY_TYPE_IDS.ENTIDAD_TERRITORIAL
    )
      return 'TERRITORIO';
    if (
      typeId === ENTITY_TYPE_IDS.PARTIDO_POLITICO ||
      typeId === ENTITY_TYPE_IDS.PARTIDO_MOVIMIENTO
    )
      return 'PARTIDO_POLITICO';
    if (typeId === ENTITY_TYPE_IDS.CASA_ENCUESTADORA)
      return 'CASA_ENCUESTADORA';
    if (
      typeId === ENTITY_TYPE_IDS.MINISTERIO ||
      typeId === ENTITY_TYPE_IDS.ORGANO_ELECTORAL ||
      typeId === ENTITY_TYPE_IDS.ASAMBLEA_LEGISLATIVA
    )
      return 'INSTITUCION';

    const typeLabel =
      typeof instanceClaim.value_relation === 'object'
        ? instanceClaim.value_relation?.label
        : undefined;
    if (typeLabel) {
      const inferred = inferEntityTypeFromLabel(typeLabel);
      if (inferred !== 'UNKNOWN') return inferred;
    }
  }

  const fallbackType = inferEntityTypeFromLabel(entityLabel);
  console.log('[deriveEntityTypeFromClaims] Using fallback from label:', {
    entityLabel,
    fallbackType,
  });
  return fallbackType;
}
