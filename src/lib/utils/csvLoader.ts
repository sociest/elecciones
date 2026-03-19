/**
 * CSV Loader Utility
 * Handles fetching, parsing, and aggregating data from local CSV files.
 */

import { getOptimizedImageUrl } from './image';

export interface CSVRow {
  [key: string]: string;
}

/**
 * Simple CSV parser that handles quoted fields with commas.
 */
export function parseCSV(text: string): CSVRow[] {
  const lines: string[] = [];
  let currentLine = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === '\n' && !inQuotes) {
      lines.push(currentLine);
      currentLine = '';
      continue;
    }
    currentLine += char;
  }
  if (currentLine) lines.push(currentLine);

  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    return row;
  });
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += char;
    }
  }
  result.push(cell.trim());
  return result.map((v) => v.replace(/^"|"$/g, '').trim());
}

/**
 * Aggregates rows by item ID, handling multi-valued fields from SPARQL.
 */
export function aggregateCandidatos(rows: CSVRow[]) {
  const aggregated = new Map<string, any>();

  rows.forEach((row) => {
    const id = row.item;
    if (!id) return;

    if (!aggregated.has(id)) {
      aggregated.set(id, {
        $id: id,
        label: row.label,
        description: row.descripcion || row.description,
        aliases: row.aliases,
        cis: new Set<string>(),
        imageUrls: new Set<string>(),
        territorioLabels: new Set<string>(),
        territorioIds: new Set<string>(),
        territorioCodigos: new Set<string>(),
        redes: {
          facebook: new Set<string>(),
          instagram: new Set<string>(),
          tiktok: new Set<string>(),
          twitter: new Set<string>(),
          youtube: new Set<string>(),
        },
        trayectorias: new Set<string>(),
        militancias: new Set<string>(),
        estudios: new Set<string>(),
        cargos: new Set<string>(),
        partidos: new Set<string>(),
      });
    }

    const entry = aggregated.get(id);
    // Update unique fields if they were missing in the first row but present here
    if (!entry.description && (row.descripcion || row.description)) entry.description = row.descripcion || row.description;
    if (!entry.aliases && row.aliases) entry.aliases = row.aliases;
    if (row.ci) entry.cis.add(row.ci);
    if (row.foto) entry.imageUrls.add(row.foto);
    if (row.territorio_label) entry.territorioLabels.add(row.territorio_label);
    if (row.territorio) entry.territorioIds.add(row.territorio);
    if (row.territorio_codigo) entry.territorioCodigos.add(row.territorio_codigo);
    
    // Social media links
    if (row.facebook) entry.redes.facebook.add(row.facebook);
    if (row.instagram) entry.redes.instagram.add(row.instagram);
    if (row.tiktok) entry.redes.tiktok.add(row.tiktok);
    if (row.twitter) entry.redes.twitter.add(row.twitter);
    if (row.youtube) entry.redes.youtube.add(row.youtube);

    // Other multi-valued fields
    if (row.trayectoria_label) entry.trayectorias.add(row.trayectoria_label);
    if (row.militancia_label) entry.militancias.add(row.militancia_label);
    if (row.estudios_label) entry.estudios.add(row.estudios_label);
    if (row.cargo_label) entry.cargos.add(row.cargo_label);
    if (row.partido_label) entry.partidos.add(row.partido_label);
  });

  return Array.from(aggregated.values()).map(entry => {
    const trayectorias = Array.from(entry.trayectorias);
    const militancias = Array.from(entry.militancias);
    const estudios = Array.from(entry.estudios);
    const cargos = Array.from(entry.cargos);
    const partidos = Array.from(entry.partidos);
    const cis = Array.from(entry.cis);
    const imageUrls = Array.from(entry.imageUrls);
    const territorioLabels = Array.from(entry.territorioLabels);
    const territorioIds = Array.from(entry.territorioIds);
    const territorioCodigos = Array.from(entry.territorioCodigos);

    const redesSociales = {
      facebook: Array.from(entry.redes.facebook)[0],
      instagram: Array.from(entry.redes.instagram)[0],
      tiktok: Array.from(entry.redes.tiktok)[0],
      twitter: Array.from(entry.redes.twitter)[0],
      youtube: Array.from(entry.redes.youtube)[0],
    };

    return {
      $id: entry.$id,
      label: entry.label,
      description: entry.description,
      aliases: entry.aliases,
      ci: cis[0] || '',
      cis,
      imageUrl: imageUrls[0] || '',
      imageUrls,
      territorioLabel: territorioLabels[0] || '',
      territorioLabels,
      territorioId: territorioIds[0] || '',
      territorioIds,
      territorioCodigo: territorioCodigos[0] || '',
      territorioCodigos,
      redesSociales,
      trayectorias,
      militancias,
      estudios,
      cargos,
      partidos,
      // For compatibility with UI types
      role: cargos[0] || '',
      party: { 
        label: partidos[0] || '', 
        color: undefined 
      }
    };
  });
}

/**
 * Aggregates survey rows by item ID.
 */
export function aggregateEncuestas(rows: CSVRow[]) {
  const aggregated = new Map<string, any>();

  rows.forEach((row) => {
    const id = row.item;
    if (!id) return;

    if (!aggregated.has(id)) {
      aggregated.set(id, {
        $id: id,
        label: row.label,
        coberturaId: row.cobertura,
        coberturaLabel: row.cobertura_label || row.coberturaLabel,
        autorId: row.autor,
        autorLabel: row.autor_label || row.autorLabel,
        fechaInicio: row.fecha_inicio || row.fechaInicio,
        fechaFin: row.fecha_fin || row.fechaFin,
        margen: row.margen,
        muestra: row.muestra,
        publicacion: row.publicacion,
        nivelConfianza: row.nivel_confianza || row.nivelConfianza,
        resultados: [],
      });
    }

    const entry = aggregated.get(id);
    const resId = row.resultado;
    const resPreg = row.resultadopregunta || row.resultado_pregunta;
    if (resId && resPreg) {
      entry.resultados.push({
        item: resId,
        label: row.resultadolabel || row.resultado_label,
        porcentaje: parseFloat(row.resultadoporcentaje || row.resultado_porcentaje) || 0,
        pregunta: resPreg,
      });
    }
  });

  return Array.from(aggregated.values());
}

/**
 * Loads and parses a CSV file from a given URL.
 */
export async function loadCSV(url: string): Promise<CSVRow[]> {
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const text = await response.text();
    return parseCSV(text);
  } catch (error) {
    console.error(`Error loading CSV from ${url}:`, error);
    return [];
  }
}
