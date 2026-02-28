export interface MapViewWrapperProps {
  selectedEntityId?: string | null;
  onMunicipalitySelect?: (
    municipality: {
      name: string;
      department: string;
      entityId: string;
    },
    isAutoDetect?: boolean
  ) => void;
  onMapReset?: () => void;
}
