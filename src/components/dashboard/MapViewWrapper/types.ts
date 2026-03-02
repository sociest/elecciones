export interface MapViewWrapperProps {
  selectedEntityId?: string | null;
  selectedDepartment?: string | null;
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
