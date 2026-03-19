/**
 * Helper para construir rutas que funcionen tanto en desarrollo como en GitHub Pages
 * Usa import.meta.env.PUBLIC_BASE_URL automáticamente configurado por Astro
 */

/**
 * Construye una ruta absoluta considerando el base path de la aplicación
 * @param path - Ruta relativa (debe empezar con /)
 * @returns Ruta completa con el base path
 *
 * @example
 * // En desarrollo: /search?q=test
 * // En GitHub Pages: /repo-name/search?q=test
 * buildPath('/search?q=test')
 */
export function buildPath(path: string): string {
  // Use Astro's built-in BASE_URL which includes the 'base' config
  const base = import.meta.env.BASE_URL || '/';
  
  // Normalize base: ensure it starts with / and ends with /
  const startSlash = base.startsWith('/') ? '' : '/';
  const endSlash = base.endsWith('/') ? '' : '/';
  const cleanBase = `${startSlash}${base}${endSlash}`.replace(/\/+$/, '/');
  
  // Normalize path: remove leading slash since base already has it
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  
  // Combined relative path
  const relativePath = `${cleanBase}${cleanPath}`;

  // If we are in the browser, we can return the full URL if needed, 
  // but usually a root-relative path (/front-graph/...) is enough for fetch()
  return relativePath;
}
