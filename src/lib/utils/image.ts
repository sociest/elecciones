export function getOptimizedImageUrl(url: string, width: number = 400): string {
  if (!url) return url;

  // Si la URL es de Appwrite, podemos usar la API de Preview para optimizar
  if (url.includes('/storage/buckets/') && url.includes('/view')) {
    // Reemplaza /view por /preview
    let optimizedUrl = url.replace('/view', '/preview');
    // Agrega los parámetros de WebP y Ancho para bajar drásticamente el peso
    optimizedUrl += `&output=webp&width=${width}`;
    return optimizedUrl;
  }

  return url;
}
