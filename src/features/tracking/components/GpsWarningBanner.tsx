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

    // 1. Activar el servicio de ubicación (Antena GPS)
    let hasServices = await Location.hasServicesEnabledAsync();
    if (!hasServices && Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
        hasServices = await Location.hasServicesEnabledAsync();
      } catch (e) {
        console.log("El usuario canceló encender el GPS");
        return;
      }
    }

    if (!hasServices) {
      return;
    }

    // 2. Solicitar permisos de primer plano
    const permissionResponse = await Location.requestForegroundPermissionsAsync();

    if (permissionResponse.status === "granted") {
      setIsGpsDisabled(false);
    } else if (!permissionResponse.canAskAgain) {
      // El usuario le dio a "No volver a preguntar"
      window.alert("Debes habilitar los permisos de ubicación manualmente en las opciones de la aplicación.");
      await Linking.openSettings();
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
