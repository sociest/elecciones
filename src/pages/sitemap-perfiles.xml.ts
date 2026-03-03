import type { APIRoute } from 'astro';
import { Client, Databases, Query } from 'appwrite';

export const GET: APIRoute = async () => {
  const endpoint = import.meta.env.PUBLIC_APPWRITE_ENDPOINT;
  const projectId = import.meta.env.PUBLIC_APPWRITE_PROJECT_ID;
  const databaseId = import.meta.env.PUBLIC_APPWRITE_DATABASE_ID;
  const entitiesCollection = 'entities'; // COLLECTIONS.ENTITIES
  const baseUrl = 'https://elecciones.sociest.org';

  if (!endpoint || !projectId || !databaseId) {
    return new Response(
      '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>',
      {
        headers: { 'Content-Type': 'application/xml' },
      }
    );
  }

  const client = new Client().setEndpoint(endpoint).setProject(projectId);

  const databases = new Databases(client);

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

  let hasMore = true;
  let cursor: string | null = null;
  const limit = 100;

  try {
    while (hasMore) {
      const queries = [Query.limit(limit), Query.select(['$id'])];
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }

      const response = await databases.listDocuments(
        databaseId,
        entitiesCollection,
        queries
      );

      response.documents.forEach((doc) => {
        sitemap += `  <url>
    <loc>${baseUrl}/entity?id=${doc.$id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>\n`;
      });

      if (response.documents.length < limit) {
        hasMore = false;
      } else {
        cursor = response.documents[response.documents.length - 1].$id;
      }
    }
  } catch (error) {
    console.error('Error fetching entities for sitemap:', error);
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
