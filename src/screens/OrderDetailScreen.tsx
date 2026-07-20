import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Linking } from "react-native";
import { useOrders } from "../hooks/useOrders";
import { trackingService } from "../services/TrackingService";

export const OrderDetailScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const { orders, updateStatus, isUpdatingStatus } = useOrders();
  
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Pedido no encontrado</Text>
      </View>
    );
  }

  const handleStartRoute = async () => {
    try {
      await updateStatus({ orderId, status: "IN_TRANSIT" });
      const started = await trackingService.startTracking(orderId);
      if (started) {
        Alert.alert("Éxito", "Recorrido iniciado. Transmitiendo ubicación en segundo plano.");
      } else {
        Alert.alert("Alerta", "Recorrido iniciado, pero verifica los permisos de ubicación.");
      }
    } catch (e) {
      Alert.alert("Error", "No se pudo iniciar el recorrido.");
    }
  };

  const handleObserveOrder = async () => {
    Alert.prompt(
      "Registrar Incidencia",
      "Escribe el motivo del retraso o incidencia:",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Confirmar", 
          onPress: async (text?: string) => {
            try {
              await updateStatus({ orderId, status: "OBSERVED" });
              await trackingService.stopTracking();
              Alert.alert("Incidencia Registrada", "El pedido ha sido marcado como observado.");
            } catch (e) {
              Alert.alert("Error", "No se pudo actualizar el estado.");
            }
          }
        }
      ]
    );
  };

  const openNavigationApp = () => {
    // Abrir Google Maps mediante Deep Link con la dirección del pedido
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.address)}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Error", "No se pudo abrir la aplicación de mapas.");
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>Nº Pedido</Text>
          <Text style={styles.valueMono}>{order.id}</Text>
          
          <View style={styles.divider} />
          
          <Text style={styles.label}>Cliente</Text>
          <Text style={styles.valueBold}>{order.client}</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>Dirección</Text>
          <Text style={styles.value}>{order.address}</Text>

          <TouchableOpacity style={styles.navLink} onPress={openNavigationApp}>
            <Text style={styles.navLinkText}>🧭 Abrir en Google Maps / Waze</Text>
          </TouchableOpacity>

          {order.notes && (
            <>
              <View style={styles.divider} />
              <Text style={styles.label}>Indicaciones Especiales</Text>
              <Text style={styles.valueItalic}>"{order.notes}"</Text>
            </>
          )}
        </View>

        <View style={styles.actionsContainer}>
          {order.status === "PENDING" && (
            <TouchableOpacity 
              style={styles.primaryButton}
              onPress={handleStartRoute}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>🚀 Iniciar Recorrido</Text>
              )}
            </TouchableOpacity>
          )}

          {order.status === "IN_TRANSIT" && (
            <>
              <TouchableOpacity 
                style={styles.successButton}
                onPress={() => navigation.navigate("Camera", { orderId: order.id })}
              >
                <Text style={styles.buttonText}>📸 Tomar Foto y Entregar (e-POD)</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.dangerButton}
                onPress={handleObserveOrder}
                disabled={isUpdatingStatus}
              >
                <Text style={styles.buttonText}>⚠️ Registrar Incidencia / Observación</Text>
              </TouchableOpacity>
            </>
          )}

          {(order.status === "DELIVERED" || order.status === "OBSERVED") && (
            <View style={styles.completedContainer}>
              <Text style={styles.completedText}>
                {order.status === "DELIVERED" 
                  ? "✅ Entrega completada correctamente." 
                  : "❌ El pedido fue observado."}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    justifyContent: "space-between",
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
  },
  value: {
    fontSize: 15,
    color: "#334155",
    marginTop: 4,
    lineHeight: 20,
  },
  valueBold: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  valueMono: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D5FFF",
    fontFamily: "monospace",
    marginTop: 4,
  },
  valueItalic: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#475569",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },
  navLink: {
    marginTop: 12,
    alignSelf: "flex-start",
  },
  navLinkText: {
    color: "#3D5FFF",
    fontWeight: "700",
    fontSize: 14,
  },
  actionsContainer: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: "#3D5FFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  successButton: {
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dangerButton: {
    backgroundColor: "#EF4444",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  completedContainer: {
    backgroundColor: "#E2E8F0",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  completedText: {
    color: "#475569",
    fontWeight: "700",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#EF4444",
    fontWeight: "700",
  },
});
