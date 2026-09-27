import React, { useEffect, useRef } from "react";
import { View } from "react-native";
import { GOOGLE_MAPS_API_KEY } from "../../../shared/config/env";


declare const google: any;

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


  focusKey?: number;
  markers?: Array<{
    id: string | number;
    latitude: number;
    longitude: number;
    title?: string;
    description?: string;
    color?: string;
    isTruck?: boolean;
    label?: string | number;
    badgeCount?: number;
  }>;
  routeCoordinates?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

export const MapViewWrapper = ({
  style,
  initialRegion,


  markers = [],
  routeCoordinates = [],
}: MapViewWrapperProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const renderedObjectsRef = useRef<any[]>([]);


  const activeMapId = undefined;

  useEffect(() => {
    if (typeof window === "undefined" || !containerRef.current) return;

    const loadScript = () => {
      if ((window as any).google?.maps) {
        initMap();
        return;
      }

      const existingScript = document.getElementById("google-maps-js");
      if (!existingScript) {
        const script = document.createElement("script");
        script.id = "google-maps-js";
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,marker`;
        script.async = true;
        script.onload = () => initMap();
        document.body.appendChild(script);
      } else {
        existingScript.addEventListener("load", () => initMap());
      }
    };

    const initMap = () => {
      if (!containerRef.current || !(window as any).google?.maps) return;
      const googleObj = (window as any).google;

      const center = { lat: initialRegion.latitude, lng: initialRegion.longitude };

      if (!mapRef.current) {
        const mapOptions: any = {
          center,
          zoom: 14,
          mapId: activeMapId,
          disableDefaultUI: true,
          zoomControl: false,
        };
        mapRef.current = new googleObj.maps.Map(containerRef.current, mapOptions);
      } else {
        mapRef.current.panTo(center);
      }

      const map = mapRef.current;

      renderedObjectsRef.current.forEach((obj) => {
        if (obj.setMap) obj.setMap(null);
        else if (obj.map) obj.map = null;
      });
      renderedObjectsRef.current = [];

      markers.forEach((m) => {
        const isTruckMarker =
          m.isTruck ||
          m.title?.includes("🚚") ||
          m.title?.toLowerCase().includes("origen") ||
          m.title?.toLowerCase().includes("chofer");

        const pinColor = m.color || "#EF4444";
        const contentDiv = document.createElement("div");
        if (isTruckMarker) {
          contentDiv.innerHTML = `
            <div style="background: #3D5FFF; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(61,95,255,0.5); cursor: pointer;">
              <span style="font-size: 22px; line-height: 1;">🚚</span>
            </div>
          `;
        } else {
          const displayLabel = m.label !== undefined && m.label !== null ? String(m.label) : "📍";
          const isNum = m.label !== undefined && !isNaN(Number(m.label));
          const badgeHtml = m.badgeCount && m.badgeCount > 1
            ? `<div style="position: absolute; top: -5px; right: -5px; background: #0F172A; border: 1.5px solid white; border-radius: 10px; min-width: 18px; height: 18px; padding: 0 3px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; color: white;">${m.badgeCount}</div>`
            : "";

          contentDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="position: relative; background: ${pinColor}; width: 38px; height: 38px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
                <span style="font-size: ${isNum ? "16px" : "18px"}; font-weight: 900; line-height: 1; color: white;">${displayLabel}</span>
                ${badgeHtml}
              </div>
              <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${pinColor}; margin-top: -2px;"></div>
            </div>
          `;
        }

        let markerObj: any;
        if (googleObj.maps.marker?.AdvancedMarkerElement && activeMapId) {
          markerObj = new googleObj.maps.marker.AdvancedMarkerElement({
            position: { lat: m.latitude, lng: m.longitude },
            map,
            title: m.title || "Ubicación",
            content: contentDiv,
          });
        } else {
          markerObj = new googleObj.maps.Marker({
            position: { lat: m.latitude, lng: m.longitude },
            map,
            title: m.title || "Ubicación",
          });
        }

        renderedObjectsRef.current.push(markerObj);
      });

      if (routeCoordinates && routeCoordinates.length > 0 && googleObj.maps) {
        const path = routeCoordinates.map((c) => ({ lat: c.latitude, lng: c.longitude }));
        const polylineObj = new googleObj.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#3D5FFF",
          strokeOpacity: 0.9,
          strokeWeight: 4,
        });
        polylineObj.setMap(map);
        renderedObjectsRef.current.push(polylineObj);
      }
    };

    loadScript();
  }, [initialRegion.latitude, initialRegion.longitude, activeMapId, markers]);

  return (
    <View style={style}>
      {/* @ts-ignore */}
      <div
        ref={containerRef}
        style={{ width: "100%", height: "100%", borderRadius: 16 }}
      />
    </View>
  );
};

export default MapViewWrapper;
