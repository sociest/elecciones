// MOCKED Appwrite Client for CSV Migration
export const client: any = {
  setEndpoint: () => client,
  setProject: () => client,
};

export const databases: any = {
  listDocuments: async () => ({ documents: [], total: 0 }),
  getDocument: async () => ({}),
  createDocument: async () => ({}),
  updateDocument: async () => ({}),
  deleteDocument: async () => ({}),
};

export const storage: any = {
  getFileView: () => '',
  getFileDownload: () => '',
};

export const DATABASE_ID = 'csv_mock';

export const COLLECTIONS = {
  ENTITIES: 'entities',
  CLAIMS: 'claims',
  QUALIFIERS: 'qualifiers',
  REFERENCES: 'references',
  AUDIT_LOG: 'audit_log',
} as const;

export const Query: any = {
  equal: () => '',
  limit: () => '',
  offset: () => '',
  orderAsc: () => '',
  orderDesc: () => '',
  search: () => '',
};

