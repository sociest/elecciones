/**
 * Build-time script: generates public/municipalities-index.json
 *
 * The file contains one entry per Bolivian municipality (INE level 3) with:
 *  - id          → Appwrite entity ID
 *  - name        → Human-readable name (from GeoJSON `nombre` property)
 *  - ineCode     → 6-digit INE code (e.g. "020101") — from GeoJSON `id` property
 *  - department  → Department name derived from the first two digits
 *  - bbox        → Pre-computed bounding box for fast candidate filtering
 *  - polygon     → Exterior ring of the geometry (lon, lat pairs) for ray-casting
 *
 * Matching strategy:
 *  1. Fetch all municipality entities from Appwrite (label contains "municipio")
 *  2. Strip "Municipio de " prefix, normalize accents/case
 *  3. Match to GeoJSON features by normalized nombre
 *  4. INE code comes from GeoJSON properties.id (already present, no claims needed)
 *
 * Run with: npx tsx scripts/generate-municipality-index.ts
 */

import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// 0. Load .env
// ---------------------------------------------------------------------------
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const envPath = resolve(projectRoot, ".env");

if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

// ---------------------------------------------------------------------------
// 1. Constants
// ---------------------------------------------------------------------------
const APPWRITE_ENDPOINT =
  process.env.PUBLIC_APPWRITE_ENDPOINT || "https://appwrite.sociest.org/v1";
const PROJECT_ID =
  process.env.PUBLIC_APPWRITE_PROJECT_ID || "697ea96f003c3264105c";
const DATABASE_ID =
  process.env.PUBLIC_APPWRITE_DATABASE_ID || "69814c38002f0783976d";

const MUNICIPAL_GEOJSON_URL = `https://appwrite.sociest.org/v1/storage/buckets/6982ca130039bc0ee4e2/files/69925c22001112baddeb/view?project=${PROJECT_ID}`;

const ENTITIES_COLLECTION = "entities";

/**
 * Manual override map: GeoJSON INE code → normalized entity name key
 * Used when the GeoJSON nombre and the Appwrite entity label diverge too much
 * for the automated normalization to bridge (typos, different names, spacing, etc.).
 *
 * Right column values must match the result of entityLabelToKey(entityLabel).
 */
const INE_TO_ENTITY_KEY: Record<string, string> = {
  // GeoJSON name                               → entity key (result of entityLabelToKey)
  "090301": "puerto gonzales moreno",           // PUERTO GONZALO MORENO → "Puerto Gonzales Moreno"
  "090501": "nuevo manoa",                      // NUEVA ESPERANZA → "Nuevo Manoa (Nueva Esperanza)"
  "010903": "las carretas",                     // LAS CARRERAS → "Las Carretas"
  "020202": "ancoraimes",                       // VILLA ANCORAIMES → "Ancoraimes"
  "031405": "cuchumuela",                       // VILLA GUALBERTO VILLARROEL → "Cuchumuela (V. G.Villarroel)"
  "010303": "villa mojocoya",                   // MOJOCOYA → "Villa Mojocoya"
  "080401": "santa ana de yacuma",              // SANTA ANA → "Santa Ana de Yacuma"
  "020403": "puerto carabuco",                  // PUERTO MAYOR DE CARABUCO → "Puerto Carabuco"
  "070302": "san miguel de velasco",            // SAN MIGUEL → "San Miguel de Velasco"
  "030802": "toko",                             // TOCO → "Toko"
  "030702": "santibanez",                       // SANTIVÁÑEZ → "Santibañez"
  "070803": "moro moro",                        // MOROMORO → "Moro Moro"
  "010502": "san pablo de huacareta",           // HUACARETA → "San Pablo de Huacareta"
  "020806": "jesus de machaca",                 // JESÚS DE MACHAKA → "Jesús de Machaca"
  "021301": "sica sica",                        // SICASICA → "Sica Sica"
  "090303": "el sena",                          // SENA → "El Sena"
  "051003": "san antonio de esmoraca",          // SAN ANTONIO DE ESMORUCO → "Esmoraca"
  "070501": "san jose de chiquitos",            // SAN JOSÉ → "San Jose de Chiquitos"
  "050104": "belen de urmiri",                  // URMIRI → "Belén de Urmiri"
  "010404": "villa alcala",                     // ALCALÁ → "Villa Alcalá"
  "010201": "villa azurduy",                    // AZURDUY → "Villa Azurduy"
  "060303": "villamontes",                      // VILLA MONTES → "Villamontes"
  "020805": "san andres de machaca",            // LA (MARKA) SAN ANDRÉS DE MACHACA
  "070804": "postrer valle",                    // POSTRERVALLE → "Postrer Valle"
  "040903": "chipaya",                          // URU CHIPAYA (NACIÓN ORIGINARIA URU CHIPAYA)
  "021703": "tito yupanki",                     // TITO YUPANQUI → "Tito Yupanki"
  "030902": "sipe sipe",                        // SIPESIPE → "Sipe Sipe"
  "051001": "san pablo de lipez",               // SAN PABLO → "San Pablo de Lipez"
  "021006": "licoma",                           // VILLA LIBERTAD LICOMA → "Licoma (Villa Libertad)"
  "080304": "rurrenabaque",                     // PUERTO MENOR DE RURRENABAQUE
  "070902": "pampa grande",                     // PAMPAGRANDE → "Pampa Grande"
  "050102": "tinquipaya",                       // TINGUIPAYA → "Tinquipaya"
  "040504": "yunguyo del litoral *",            // YUNGUYO DEL LITORAL → "Yunguyo del Litoral *"
  "020301": "coro coro",                        // COROCORO → "Coro Coro"
  "030301": "independencia",                    // AYOPAYA → "Independencia"
  "040701": "villa huanuni",                    // HUANUNI → "Villa Huanuni"
  "071403": "carmen rivero torrez",             // EL CARMEN RIVERO TÓRREZ → "Carmen Rivero Torrez"
  "011002": "huacaya",                          // HUACAYA (AUTONOMÍA ...) → "Huacaya"
  "041201": "santiago de andamarca",            // ANDAMARCA → "Santiago de Andamarca"
  // TIOC entries: no entity found, skip by mapping to impossible key
  "051204": "__no_entity__",  // TIOC-JATUN AYLLU YURA
  "080901": "__no_entity__",  // TIOC-TERRITORIO INDÍGENA MULTIÉTNICO
  "031304": "__no_entity__",  // TIOC-RAQAYPAMPA
};

/**
 * Direct Appwrite entity $id overrides for municipalities whose labels cannot
 * be reliably normalised (e.g. embedded double-quotes that confuse the regex).
 * These take priority over INE_TO_ENTITY_KEY.
 */
const INE_TO_ENTITY_ID: Record<string, string> = {
  "050901": "69839a45243b68c069b3", // Municipio de "Colcha""K"" (V.Martin)"
  "051102": "698399cd57f8b96d5a98", // Municipio de "Caiza ""D"""
};

const DEPARTMENT_NAME_BY_CODE: Record<string, string> = {
  "01": "Chuquisaca",
  "02": "La Paz",
  "03": "Cochabamba",
  "04": "Oruro",
  "05": "Potosí",
  "06": "Tarija",
  "07": "Santa Cruz",
  "08": "Beni",
  "09": "Pando",
};

const OUTPUT_PATH = resolve(projectRoot, "public", "municipalities-index.json");

// ---------------------------------------------------------------------------
// 2. Name normalization helpers
// ---------------------------------------------------------------------------

/** Normalize a string for fuzzy matching: lowercase, strip accents, trim whitespace */
function normalizeName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "") // strip combining diacritics
    .toLowerCase()
    .trim();
}

/**
 * Extract the municipality's base name from an Appwrite entity label.
 * Examples:
 *   "Municipio de Ixiamas"                        → "ixiamas"
 *   "Municipio de Nuevo Manoa (Nueva Esperanza)"  → "nuevo manoa"
 *   "Municipio de La Paz"                         → "la paz"
 */
function entityLabelToKey(label: string): string {
  let name = label.trim();

  // Strip "Municipio de " prefix (case-insensitive)
  name = name.replace(/^municipio\s+de\s+/i, "");

  // Strip parenthetical suffix, e.g. "(Nueva Esperanza)"
  name = name.replace(/\s*\(.*?\)\s*$/, "");

  return normalizeName(name);
}

// ---------------------------------------------------------------------------
// 3. Fetch all municipality entities from Appwrite
//    Uses cursor-based pagination (cursorAfter + orderAsc($sequence))
//    Returns: Map<normalizedName → entityId>
// ---------------------------------------------------------------------------
async function fetchMunicipalityEntities(): Promise<Map<string, string>> {
  console.log('📡 Fetching municipality entities from Appwrite (search: "municipio" in label)...');

  const LIMIT = 500;
  const map = new Map<string, string>(); // normalizedName → $id
  let lastId: string | null = null;
  let page = 0;

  while (true) {
    const queries: string[] = [
      JSON.stringify({ method: "limit", values: [LIMIT] }),
      JSON.stringify({ method: "orderAsc", attribute: "$sequence" }),
      JSON.stringify({ method: "search", attribute: "label", values: ["municipio"] }),
    ];

    if (lastId !== null) {
      queries.push(JSON.stringify({ method: "cursorAfter", values: [lastId] }));
    }

    const qs = queries.map((q) => `queries[]=${encodeURIComponent(q)}`).join("&");
    const url = `${APPWRITE_ENDPOINT}/databases/${DATABASE_ID}/collections/${ENTITIES_COLLECTION}/documents?${qs}`;

    const res = await fetch(url, {
      headers: { "X-Appwrite-Project": PROJECT_ID },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Entities fetch error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const docs: any[] = data.documents ?? [];
    page++;

    for (const doc of docs) {
      const label: string = doc.label ?? "";
      if (!label) continue;
      const key = entityLabelToKey(label);
      if (key) map.set(key, doc.$id);
    }

    console.log(`  Page ${page}: got ${docs.length} docs, total entities so far: ${map.size}`);

    if (docs.length < LIMIT) break;
    lastId = docs[docs.length - 1].$id;
  }

  console.log(`✅ Municipality entities fetched: ${map.size}\n`);
  return map;
}

// ---------------------------------------------------------------------------
// 4. Geometry helpers
// ---------------------------------------------------------------------------
type Ring = number[][]; // [[lon, lat], ...]

function extractExteriorRing(geometry: any): Ring | null {
  if (!geometry) return null;

  if (geometry.type === "Polygon") {
    return geometry.coordinates?.[0] ?? null;
  }
  if (geometry.type === "MultiPolygon") {
    // Take the largest polygon by ring length
    const rings: Ring[] = (geometry.coordinates ?? []).map((p: any) => p[0]).filter(Boolean);
    if (rings.length === 0) return null;
    return rings.reduce((best, r) => (r.length > best.length ? r : best), rings[0]);
  }
  if (geometry.type === "Feature") {
    return extractExteriorRing(geometry.geometry);
  }
  return null;
}

function computeBbox(ring: Ring): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  let minLat = Infinity, maxLat = -Infinity, minLon = Infinity, maxLon = -Infinity;
  for (const [lon, lat] of ring) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lon < minLon) minLon = lon;
    if (lon > maxLon) maxLon = lon;
  }
  return { minLat, maxLat, minLon, maxLon };
}

/** Douglas-Peucker simplification for a ring (reduces polygon vertex count) */
function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;

  function perpendicularDistance(point: number[], lineStart: number[], lineEnd: number[]): number {
    const dx = lineEnd[0] - lineStart[0];
    const dy = lineEnd[1] - lineStart[1];
    if (dx === 0 && dy === 0) {
      return Math.hypot(point[0] - lineStart[0], point[1] - lineStart[1]);
    }
    const t = ((point[0] - lineStart[0]) * dx + (point[1] - lineStart[1]) * dy) / (dx * dx + dy * dy);
    const closestX = lineStart[0] + t * dx;
    const closestY = lineStart[1] + t * dy;
    return Math.hypot(point[0] - closestX, point[1] - closestY);
  }

  function rdp(points: Ring, eps: number): Ring {
    if (points.length <= 2) return points;
    let maxDist = 0;
    let maxIdx = 0;
    for (let i = 1; i < points.length - 1; i++) {
      const d = perpendicularDistance(points[i], points[0], points[points.length - 1]);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > eps) {
      const left = rdp(points.slice(0, maxIdx + 1), eps);
      const right = rdp(points.slice(maxIdx), eps);
      return [...left.slice(0, -1), ...right];
    }
    return [points[0], points[points.length - 1]];
  }

  const simplified = rdp(ring, tolerance);
  // Ensure ring is closed
  if (
    simplified[0][0] !== simplified[simplified.length - 1][0] ||
    simplified[0][1] !== simplified[simplified.length - 1][1]
  ) {
    simplified.push(simplified[0]);
  }
  return simplified;
}

// ---------------------------------------------------------------------------
// 5. Main
// ---------------------------------------------------------------------------
export interface MunicipalityEntry {
  id: string;
  name: string;
  ineCode: string;
  department: string;
  bbox: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  polygon: Ring;
}

async function main() {
  console.log("🚀 Generating municipalities-index.json...\n");

  // 5a. Fetch GeoJSON
  console.log("📥 Fetching municipal GeoJSON from Appwrite Storage...");
  const geoRes = await fetch(MUNICIPAL_GEOJSON_URL, {
    headers: { Accept: "application/json" },
  });
  if (!geoRes.ok) throw new Error(`GeoJSON fetch failed: ${geoRes.status}`);
  const geoData = await geoRes.json();
  const features: any[] = geoData.features ?? [];
  console.log(`✅ GeoJSON loaded: ${features.length} features\n`);

  // 5b. Fetch municipality entities (name → id map)
  const entityMap = await fetchMunicipalityEntities();

  // 5c. Build index by matching GeoJSON features to entity IDs via normalized name
  const index: MunicipalityEntry[] = [];
  const unmatched: string[] = [];

  for (const feature of features) {
    const props = feature.properties ?? {};
    const ineCode = props.id ? String(props.id).trim() : "";
    const rawName = (props.nombre ?? "").trim(); // e.g. "IXIAMAS"

    if (!ineCode || !rawName || !feature.geometry) continue;

    // --- Primary lookup: normalize the GeoJSON name and search entity map ---
    // Strip known GeoJSON-specific prefixes and suffixes before normalizing
    let strippedName = rawName
      .replace(/^TIOC-/i, "")                   // "TIOC-RAQAYPAMPA" → "RAQAYPAMPA"
      .replace(/^PUERTO MAYOR DE /i, "")          // "PUERTO MAYOR DE GUAQUI" → "GUAQUI"
      .replace(/^PUERTO MENOR DE /i, "")          // "PUERTO MENOR DE RURRENABAQUE" → "RURRENABAQUE"
      .replace(/\s*\(.*?\)\s*$/, "")             // strip trailing parenthetical
      .replace(/["]/g, "")                        // strip fancy quotes
      .trim();
    const normalizedName = normalizeName(strippedName);

    // --- Override map: prefer INE-code-based override when names diverge ---
    const directId = INE_TO_ENTITY_ID[ineCode];
    if (directId === undefined) {
      // normal key-based lookup
    }
    const overrideKey = INE_TO_ENTITY_KEY[ineCode];
    const lookupKey = overrideKey ?? normalizedName;

    let entityId: string | undefined = directId;
    if (!entityId) entityId = entityMap.get(lookupKey);

    // --- Fallback: also try the plain normalized name even if override was set ---
    if (!entityId && overrideKey) {
      entityId = entityMap.get(normalizedName);
    }

    if (!entityId) {
      unmatched.push(`${rawName} (${ineCode})`);
      continue;
    }

    const ring = extractExteriorRing(feature.geometry);
    if (!ring || ring.length < 4) continue;

    // Simplify: tolerance ~0.001° ≈ ~100m at Bolivia's latitude
    const simplified = simplifyRing(ring, 0.001);
    const bbox = computeBbox(simplified);

    const departmentCode = ineCode.slice(0, 2);
    const department = DEPARTMENT_NAME_BY_CODE[departmentCode] ?? "Bolivia";

    index.push({ id: entityId, name: rawName, ineCode, department, bbox, polygon: simplified });
  }

  // Report results
  console.log(`\n📊 Results:`);
  console.log(`  Municipalities indexed: ${index.length}`);
  console.log(`  Unmatched GeoJSON features: ${unmatched.length}`);

  if (unmatched.length > 0 && unmatched.length <= 30) {
    console.log(`\n  Unmatched:`);
    for (const u of unmatched) console.log(`    - ${u}`);
  } else if (unmatched.length > 30) {
    console.log(`\n  First 30 unmatched:`);
    for (const u of unmatched.slice(0, 30)) console.log(`    - ${u}`);
  }

  // Also report any entity keys that had no GeoJSON counterpart (informational)
  const matchedNames = new Set(
    features
      .map((f) => normalizeName((f.properties?.nombre ?? "").trim()))
      .filter(Boolean),
  );
  const unmatchedEntities = [...entityMap.keys()].filter((k) => !matchedNames.has(k));
  if (unmatchedEntities.length > 0) {
    console.log(`\n  Entity names with no GeoJSON match (${unmatchedEntities.length}):`);
    for (const e of unmatchedEntities.slice(0, 20)) console.log(`    - "${e}"`);
  }

  // 5d. Write output
  writeFileSync(OUTPUT_PATH, JSON.stringify(index), "utf-8");
  const bytes = Buffer.byteLength(JSON.stringify(index));

}

main().catch((err) => {
  console.error("\n❌ Fatal error in municipality-index generation:");
  console.error(err instanceof Error ? err.message : err);
  if (err instanceof Error && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
