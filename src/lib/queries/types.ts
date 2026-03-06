import type { Models } from 'appwrite';

export interface Entity extends Models.Document {
  label?: string;
  description?: string;
  aliases?: string[];
}

export interface Authority extends Entity {
  role?: string;
  party?: Entity & { color?: string };
  imageUrl?: string;
}

export interface Claim extends Models.Document {
  subject?: Entity;
  property?: Entity;
  value_raw?: string;
  value_relation?: Entity;
  datatype:
    | 'string'
    | 'date'
    | 'boolean'
    | 'coordinate'
    | 'image'
    | 'json'
    | 'number'
    | 'url'
    | 'relation'
    | 'polygon'
    | 'color'
    | 'entity';
  qualifiers?: Qualifier[];
  references?: Reference[];
}

export interface Qualifier extends Models.Document {
  claim?: Claim | string;
  property?: Entity;
  value_raw?: string;
  value_relation?: Entity;
  datatype:
    | 'string'
    | 'date'
    | 'boolean'
    | 'coordinate'
    | 'image'
    | 'json'
    | 'number'
    | 'url'
    | 'relation'
    | 'polygon'
    | 'color'
    | 'entity';
}

export interface Reference extends Models.Document {
  claim?: Claim | string;
  reference?: Entity | string;
  details?: string;
}

export interface PolygonData {
  entityId: string;
  entityLabel: string;
  coordinates: number[][][];
  administrativeLevel: number;
  departamentName?: string;
  ineCode?: string;
  hasEntity?: boolean;
}
