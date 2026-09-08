export type MapTheme = "light" | "dark";

export interface MapMarkerItem {
  id: string | number;
  latitude: number;
  longitude: number;
  title?: string;
  description?: string;
  color?: string;
  isTruck?: boolean;
  label?: string | number;
  badgeCount?: number;
}

export interface MapPolylineItem {
  id: string | number;
  coordinates: Array<{ latitude: number; longitude: number }>;
  color?: string;
}

export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapViewWrapperProps {
  style?: any;
  initialRegion: MapRegion;
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  theme?: MapTheme;
  googleMapId?: string;
  markers?: MapMarkerItem[];
  polylines?: MapPolylineItem[];
}
