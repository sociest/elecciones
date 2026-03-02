export interface MapViewProps {
  onMunicipalitySelect?: (
    municipality: {
      name: string;
      department: string;
      entityId: string;
      hasEntity?: boolean;
    },
    isAutoDetect?: boolean
  ) => void;
  onMapReset?: () => void;
  selectedEntityId?: string | null;
  selectedDepartment?: string | null;
}

export interface MunicipalityFeature {
  type: 'Feature';
  properties: {
    id: string;
    name: string;
    department: string;
    level: number;
    ineCode?: string;
    hasEntity?: boolean;
  };
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
}

export interface MunicipalityGeoJSON {
  type: 'FeatureCollection';
  features: MunicipalityFeature[];
}
