import React from "react";
import { View, Text } from "react-native";

export interface MapViewWrapperProps {
  style?: any;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  theme?: "light" | "dark";
  googleMapId?: string;
  markers?: Array<{
    id: string | number;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    color?: string;
    isTruck?: boolean;
  }>;
  polylines?: Array<{
    id: string | number;
    coordinates: Array<{ latitude: number; longitude: number }>;
    color?: string;
  }>;
  routeCoordinates?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

export const MapViewWrapper: React.FC<MapViewWrapperProps> = (props) => {
  return (
    <View style={[{ backgroundColor: "#E2E8F0", justifyContent: "center", alignItems: "center" }, props.style]}>
      <Text style={{ color: "#64748B", fontSize: 13 }}>Cargando mapa...</Text>
    </View>
  );
};

export default MapViewWrapper;
