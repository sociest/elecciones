import type { APIRoute } from 'astro';
import { parseCSV } from '../lib/utils/csvLoader';
import { readFileSync } from 'fs';
import { join } from 'path';

export const GET: APIRoute = async () => {
  const baseUrl = 'https://elecciones.sociest.org';
  
  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/mapa</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/search</loc>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>\n`;

  try {
    const csvPath = join(process.cwd(), 'public', 'data', 'candidatos.csv');
    const csvText = readFileSync(csvPath, 'utf-8');
    const rows = parseCSV(csvText);
    
    // Get unique item IDs
    const itemIds = new Set(rows.map(row => row.item).filter(Boolean));

    itemIds.forEach((id) => {
      sitemap += `  <url>
    <loc>${baseUrl}/entity?id=${id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
    });
  } catch (error) {
    console.error('Error generating sitemap from CSV:', error);
  }

  sitemap += `</urlset>`;

  return new Response(sitemap, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
