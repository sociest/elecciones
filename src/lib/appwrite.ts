import { Client, Databases, Storage, Query } from 'appwrite';

const client = new Client();

client
  .setEndpoint(import.meta.env.PUBLIC_APPWRITE_ENDPOINT)
  .setProject(import.meta.env.PUBLIC_APPWRITE_PROJECT_ID);

// Only export services that are actually used
export const databases = new Databases(client);
export const storage = new Storage(client);
export { client };

export const DATABASE_ID = import.meta.env.PUBLIC_APPWRITE_DATABASE_ID;

export const COLLECTIONS = {
  ENTITIES: 'entities',
  CLAIMS: 'claims',
  QUALIFIERS: 'qualifiers',
  REFERENCES: 'references',
  AUDIT_LOG: 'audit_log',
} as const;

export const GEOJSON_BUCKET_ID = '6982ca130039bc0ee4e2'; // Update if different

export { Query };
