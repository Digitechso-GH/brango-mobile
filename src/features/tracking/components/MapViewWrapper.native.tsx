import React from "react";
import { View, Text } from "react-native";
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from "react-native-maps";
import { useMapId, MapTheme } from "../hooks/useMapId";

interface MapViewWrapperProps {
  style?: any;
  initialRegion: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
  scrollEnabled?: boolean;
  zoomEnabled?: boolean;
  theme?: MapTheme;
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
  routeCoordinates?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

export const MapViewWrapper = ({
  style,
  initialRegion,
  scrollEnabled = true,
  zoomEnabled = true,
  theme,
  googleMapId: customMapId,
  markers = [],
  routeCoordinates = [],
}: MapViewWrapperProps) => {
  const dynamicMapId = useMapId(theme);
  const activeMapId = customMapId || dynamicMapId;

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      googleMapId={activeMapId}
      style={style}
      region={initialRegion}
      showsUserLocation={true}
      showsMyLocationButton={false}
      scrollEnabled={scrollEnabled}
      zoomEnabled={zoomEnabled}
    >
      {routeCoordinates && routeCoordinates.length > 0 ? (
        <Polyline
          coordinates={routeCoordinates}
          strokeColor="#3D5FFF"
          strokeWidth={4}
        />
      ) : null}
      {markers.map((m) => {
        const isTruckMarker =
          m.isTruck ||
          m.title?.includes("🚚") ||
          m.title?.toLowerCase().includes("origen") ||
          m.title?.toLowerCase().includes("chofer");

        return (
          <Marker
            key={m.id}
            coordinate={{
              latitude: m.latitude,
              longitude: m.longitude,
            }}
            title={m.title}
            description={m.description}
            pinColor={m.color || "#3D5FFF"}
          >
            {isTruckMarker ? (
              <View
                style={{
                  backgroundColor: "#3D5FFF",
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  justifyContent: "center",
                  alignItems: "center",
                  borderWidth: 3,
                  borderColor: "#FFFFFF",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.35,
                  shadowRadius: 5,
                  elevation: 6,
                }}
              >
                <Text style={{ fontSize: 22 }}>🚚</Text>
              </View>
            ) : (
              <View style={{ alignItems: "center" }}>
                <View
                  style={{
                    backgroundColor: m.color || "#3D5FFF",
                    width: 38,
                    height: 38,
                    borderRadius: 19,
                    justifyContent: "center",
                    alignItems: "center",
                    borderWidth: 3,
                    borderColor: "#FFFFFF",
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 6,
                  }}
                >
                  <Text style={{ fontSize: 18, color: "#FFFFFF" }}>📍</Text>
                </View>
                <View
                  style={{
                    width: 0,
                    height: 0,
                    borderLeftWidth: 6,
                    borderRightWidth: 6,
                    borderTopWidth: 8,
                    borderStyle: "solid",
                    backgroundColor: "transparent",
                    borderLeftColor: "transparent",
                    borderRightColor: "transparent",
                    borderTopColor: m.color || "#3D5FFF",
                    marginTop: -2,
                  }}
                />
              </View>
            )}
          </Marker>
        );
      })}
    </MapView>
  );
};

export default MapViewWrapper;
