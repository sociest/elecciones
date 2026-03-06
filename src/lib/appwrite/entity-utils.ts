import { Databases, Query } from 'appwrite';
import {
  DB_ID,
  COLLECTION_IDS,
  PROPERTY_IDS,
  ENTITY_TYPE_IDS,
} from '@/lib/constants/entity-types';

export type EntityType =
  | 'PERSONA'
  | 'POLITICO'
  | 'TERRITORIO'
  | 'INSTITUCION'
  | 'PARTIDO_POLITICO'
  | 'ENCUESTA'
  | 'CASA_ENCUESTADORA'
  | 'EDUCACION'
  | 'ROL'
  | 'UNKNOWN';

const INSTITUTION_LABEL_HINTS = [
  'ministerio',
  'gobernacion',
  'gobernación',
  'alcaldia',
  'alcaldía',
  'tribunal',
  'organo',
  'órgano',
  'asamblea',
  'universidad',
  'instituto',
  'corte',
  'servicio',
];

const SURVEY_LABEL_HINTS = [
  'encuesta',
  'intención',
  'intension',
  'estudio',
  'resultado',
];

const EDUCATION_LABEL_HINTS = [
  'universidad',
  'umsa',
  'unam',
  'cides',
  'instituto',
];

const ROLE_LABEL_HINTS = [
  'alcalde',
  'gobernador',
  'concejal',
  'asambleista',
  'asambleísta',
  'asambleistas departamentales',
  'asambleístas departamentales',
  'candidato politico',
  'cargo de trabajo',
];

const TERRITORY_LABEL_HINTS = [
  'departamento',
  'municipio',
  'provincia',
  'pais',
  'país',
  'territorio',
  'ciudad',
  'localidad',
];

export function inferEntityTypeFromLabel(label?: string): EntityType {
  if (!label) return 'UNKNOWN';
  const normalized = label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (ROLE_LABEL_HINTS.some((hint) => normalized.includes(hint))) return 'ROL';
  if (
    normalized.includes('casa encuestadora') ||
    normalized.includes('empresa encuestadora') ||
    normalized.includes('firma encuestadora') ||
    normalized.includes('consultora e investigación') ||
    normalized.includes('consultora') ||
    normalized.includes('consulting') ||
    normalized.includes('ciesmori') ||
    normalized.includes('ciemcorp') ||
    normalized.includes('ipsos') ||
    normalized.includes('focaliza') ||
    normalized.includes('misk') ||
    normalized.includes('mori') ||
    normalized.includes('mercado y muestras') ||
    normalized.includes('viaciencia') ||
    normalized.includes('diagnosis') ||
    normalized.includes('real data') ||
    normalized.includes('celag') ||
    normalized.includes('talcual') ||
    normalized.includes('datos') ||
    normalized.includes('upea')
  )
    return 'CASA_ENCUESTADORA';
  if (SURVEY_LABEL_HINTS.some((hint) => normalized.includes(hint)))
    return 'ENCUESTA';
  if (EDUCATION_LABEL_HINTS.some((hint) => normalized.includes(hint)))
    return 'EDUCACION';
  if (INSTITUTION_LABEL_HINTS.some((hint) => normalized.includes(hint)))
    return 'INSTITUCION';
  if (TERRITORY_LABEL_HINTS.some((hint) => normalized.includes(hint)))
    return 'TERRITORIO';
  return 'UNKNOWN';
}

/**
 * Determines the type of an entity based on its claims.
 * Specifically looks for 'es instancia de' property.
 */
export async function determineEntityType(
  entityId: string,
  databases: Databases
): Promise<EntityType> {
  try {
    const claims = await databases.listDocuments(DB_ID, COLLECTION_IDS.CLAIMS, [
      Query.equal('subject', entityId),
      Query.equal('property', PROPERTY_IDS.ES_INSTANCIA_DE),
    ]);

    if (claims.total > 0) {
      for (const claim of claims.documents) {
        const typeId = claim.value_relation?.$id || claim.value_relation;

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

        let typeLabel =
          typeof claim.value_relation === 'object'
            ? claim.value_relation.label
            : '';

        if (!typeLabel && typeof typeId === 'string') {
          try {
            const relDoc = await databases.getDocument(
              DB_ID,
              COLLECTION_IDS.ENTITIES,
              typeId
            );
            typeLabel = relDoc.label;
          } catch {
            // ignore
          }
        }

        if (typeLabel) {
          const inferred = inferEntityTypeFromLabel(typeLabel);
          if (inferred !== 'UNKNOWN') return inferred;
        }
      }
    }

    const entity = await databases.getDocument(
      DB_ID,
      COLLECTION_IDS.ENTITIES,
      entityId
    );
    return inferEntityTypeFromLabel(entity.label);
  } catch (error) {
    console.error('Error determining entity type:', error);
    return 'UNKNOWN';
  }
}
