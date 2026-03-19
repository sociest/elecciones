export interface Entity {
  $id: string;
  label?: string;
  description?: string;
  aliases?: string[];
  imageUrl?: string;
  redesSociales?: {
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    twitter?: string;
    youtube?: string;
  };
}

export interface Authority extends Entity {
  role?: string;
  party?: Entity & { color?: string };
  territorioLabel?: string;
  territorioId?: string;
  ci?: string;
  cis?: string[];
  imageUrls?: string[];
  territorioLabels?: string[];
  territorioIds?: string[];
  territorioCodigo?: string;
  territorioCodigos?: string[];
  trayectorias?: string[];
  estudios?: string[];
  militancias?: string[];
  cargos?: string[];
  partidos?: string[];
  results?: {
    encuestaId: string;
    autorLabel: string;
    fechaFin: string;
    porcentaje: number;
    pregunta: string;
  }[];
}

export interface Claim {
  $id: string;
  subject?: Entity | string;
  property?: Entity | string;
  value_raw?: string;
  value_relation?: Entity | string;
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

export interface Qualifier {
  $id: string;
  claim?: Claim | string;
  property?: Entity | string;
  value_raw?: string;
  value_relation?: Entity | string;
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

export interface Reference {
  $id: string;
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

