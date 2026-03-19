/**
 * Simple CSV parser that handles basic CSV strings and converts them to objects.
 * Supports quoted values and handles escapes.
 */
export function parseCSV<T>(csvText: string): T[] {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]);
  const results: T[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCSVLine(lines[i]);
    const obj: any = {};
    
    headers.forEach((header, index) => {
      // Map header names to property names if needed, but for now we assume they match
      obj[header.trim()] = values[index]?.trim() || '';
    });
    
    results.push(obj as T);
  }

  return results;
}

function splitCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
