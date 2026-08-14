import React, { useEffect, useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Platform, Linking } from "react-native";
import * as Location from "expo-location";

export const GpsWarningBanner = () => {
  const [isGpsDisabled, setIsGpsDisabled] = useState(false);

  const checkGpsStatus = async () => {
    try {
      if (Platform.OS === "web") {
        const { status } = await Location.getForegroundPermissionsAsync();
        setIsGpsDisabled(status !== "granted");
      } else {
        const hasServices = await Location.hasServicesEnabledAsync();
        const { status } = await Location.getForegroundPermissionsAsync();
        setIsGpsDisabled(!hasServices || status !== "granted");
      }
    } catch (e) {
      console.log("Error al verificar estado del GPS:", e);
    }
  };

  useEffect(() => {
    checkGpsStatus();
    const interval = setInterval(checkGpsStatus, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenGpsSettings = async () => {
    if (Platform.OS === "web") {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          setIsGpsDisabled(false);
        } else {
          window.alert("Ubicación desactivada. Por favor habilita el permiso de ubicación en tu navegador.");
        }
      } catch (e) {
        window.alert("Por favor habilita los permisos de ubicación en tu navegador.");
      }
      return;
    }

    try {
      // 1. Activar el servicio de ubicación directamente por el diálogo nativo de Android
      if (Platform.OS === "android") {
        try {
          await Location.enableNetworkProviderAsync();
        } catch (e) {
          // El usuario presionó "No gracias" en el cuadro nativo
        }
      }

      // 2. Solicitar permisos de primer plano mediante diálogo nativo si hicieran falta
      const { status } = await Location.requestForegroundPermissionsAsync();
      const hasServices = await Location.hasServicesEnabledAsync();

      if (hasServices && status === "granted") {
        setIsGpsDisabled(false);
      }
    } catch (e) {
      console.log("Error activando servicio GPS nativo:", e);
    }
  };

  if (!isGpsDisabled) return null;

  return (
    <TouchableOpacity
      style={styles.banner}
      onPress={handleOpenGpsSettings}
      activeOpacity={0.85}
    >
      <View style={styles.content}>
        <View style={styles.leftGroup}>
          <Text style={styles.icon}>📍</Text>
          <Text style={styles.text} numberOfLines={1}>
            Servicio de ubicación desactivado. Toca aquí para activar.
          </Text>
        </View>
        <Text style={styles.arrow}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: "100%",
    zIndex: 9999,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  leftGroup: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  text: {
    flex: 1,
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
  },
  arrow: {
    color: "#0F172A",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 22,
  },
});
