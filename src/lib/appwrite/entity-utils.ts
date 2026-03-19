// Removed Appwrite and constants imports as they are no longer needed in CSV mode


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
 * Determines the type of an entity (CSV version).
 * In the new CSV architecture, we mainly rely on label inference 
 * or the entityType field if provided.
 */
export async function determineEntityType(
  entityId: string,
  _databases: any, // ignore for compatibility
  entity?: any
): Promise<EntityType> {
  try {
    if (entity?.label) {
        return inferEntityTypeFromLabel(entity.label);
    }
    
    // Default or fallback
    return 'UNKNOWN';
  } catch (error) {
    console.error('Error determining entity type (CSV):', error);
    return 'UNKNOWN';
  }
}

