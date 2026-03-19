import { parseCSV } from '../utils/csv';
import { buildPath } from '../utils/paths';

let candidatesCache: any[] | null = null;
let partiesCache: any[] | null = null;
let surveysCache: any[] | null = null;

export async function getLocalCandidates() {
  if (candidatesCache) return candidatesCache;
  const resp = await fetch(buildPath('/datos/candidatos.csv'));
  const text = await resp.text();
  candidatesCache = parseCSV(text);
  return candidatesCache;
}

export async function getLocalParties() {
  if (partiesCache) return partiesCache;
  const resp = await fetch(buildPath('/datos/partidos.csv'));
  const text = await resp.text();
  partiesCache = parseCSV(text);
  return partiesCache;
}

export async function getLocalSurveys() {
  if (surveysCache) return surveysCache;
  const resp = await fetch(buildPath('/datos/encuestas.csv'));
  const text = await resp.text();
  surveysCache = parseCSV(text);
  return surveysCache;
}

export async function getUnifiedData() {
  const [candidates, parties, surveys] = await Promise.all([
    getLocalCandidates(),
    getLocalParties(),
    getLocalSurveys(),
  ]);

  const partyMap: Record<string, any> = {};
  parties.forEach((p) => {
    partyMap[p.item] = {
      $id: p.item,
      label: p.label,
      sigla: p.sigla,
      logo: p.logo,
      color: p.colores?.split('|')[0]?.trim(),
    };
  });

  const transformedCandidates = candidates.map((c) => ({
    $id: c.item,
    label: c.label,
    imageUrl: c.foto,
    role: c.cargo,
    party: partyMap[c.partido],
    territorio: c.territorio,
    type: 'Candidato',
    ...c,
  }));

  const transformedSurveys = surveys.map((s) => ({
    $id: s.item,
    label: s.label,
    coberturaLabel: s.coberturaLabel,
    description: `Estudio realizado por ${s.autorLabel}.`,
    autor: s.autor,
    autorLabel: s.autorLabel,
    publicacion: s.publicacion,
    type: 'Encuesta',
    ...s,
  }));

  return {
    candidates: transformedCandidates,
    parties: Object.values(partyMap),
    surveys: transformedSurveys,
  };
}

export async function findEntityById(id: string) {
  const data = await getUnifiedData();
  const found =
    data.candidates.find((c) => c.$id === id) ||
    data.surveys.find((s) => s.$id === id) ||
    data.parties.find((p) => (p as any).$id === id);
  return found;
}

export async function getClaimsForEntity(id: string) {
  const entity = await findEntityById(id);
  if (!entity) return [];

  // Emulate claims from keys
  return Object.entries(entity)
    .filter(([key]) => !key.startsWith('$') && key !== 'item')
    .map(([key, value]) => ({
      $id: `${id}_${key}`,
      subject: id,
      property: { $id: key, label: key },
      value_string: typeof value === 'string' ? value : JSON.stringify(value),
      datatype: 'string' as any,
    }));
}
