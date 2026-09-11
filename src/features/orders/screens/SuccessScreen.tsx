import React, { useEffect } from "react";
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useOrders } from "../hooks/useOrders";
import { ORDER_STATUS } from "../constants/order-status";

export const SuccessScreen = ({ route, navigation }: any) => {
  const { orderId, client, guia, isObserved, note } = route.params || {};
  const { orders, refetch } = useOrders();

  useEffect(() => {
    const onBackPress = () => {
      // Bloquear botón atrás físico en pantalla de éxito
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, []);

  const nextOrder = orders.find(
    (o) =>
      o.id !== orderId &&
      (o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT)
  );

  const handleContinue = () => {
    try {
      refetch();
    } catch (e) {
      // Ignorar errores de refetch
    }
    navigation.reset({
      index: 0,
      routes: [{ name: "Roadmap" }],
    });
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      // Ignorar si falla
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Header Superior con ícono sutil de configuración */}
          <View style={styles.cardHeader}>
            <TouchableOpacity
              onPress={handleOpenSettings}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="settings-outline" size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <View style={styles.cardBody}>
            {/* Ícono Circular de Estado */}
            <View style={[styles.iconContainer, isObserved && styles.observedIconContainer]}>
              <Ionicons
                name={isObserved ? "alert-circle-outline" : "checkmark"}
                size={isObserved ? 36 : 34}
                color={isObserved ? "#DC2626" : "#166534"}
              />
            </View>

            {/* Título Principal */}
            <Text style={styles.title}>
              {isObserved ? "Incidencia reportada" : "Entrega confirmada"}
            </Text>

            {/* Subtítulo: Cliente y Guía */}
            <Text style={styles.subtitle}>
              {client || "—"}{guia ? ` · Guía #${guia}` : ""}
            </Text>

            {/* Nota de Incidencia / Observación (si aplica) */}
            {isObserved && note ? (
              <View style={styles.noteBox}>
                <Text style={styles.noteLabel}>Motivo registrado</Text>
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ) : null}

            {/* Caja Informativa Central */}
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                {isObserved
                  ? "La incidencia fue notificada a la Torre de Control y registrada en la hoja de ruta."
                  : "La evidencia de entrega se guardó y se notificó correctamente."}
              </Text>
            </View>

            {/* Sección Siguiente Parada */}
            {nextOrder ? (
              <View style={styles.nextStopSection}>
                <Text style={styles.nextStopLabel}>SIGUIENTE PARADA</Text>
                <View style={styles.nextStopCard}>
                  <View style={styles.stopIconContainer}>
                    <Ionicons name="location-outline" size={20} color="#64748B" />
                  </View>
                  <View style={styles.nextStopDetails}>
                    <Text style={styles.nextStopClient} numberOfLines={1}>
                      {nextOrder.client}
                    </Text>
                    <Text style={styles.nextStopAddress} numberOfLines={1}>
                      {nextOrder.address || nextOrder.formattedAddress || "—"}
                    </Text>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.nextStopSection}>
                <Text style={styles.nextStopLabel}>HOJA DE RUTA</Text>
                <View style={styles.nextStopCard}>
                  <View style={[styles.stopIconContainer, { backgroundColor: "#ECFDF5" }]}>
                    <Ionicons name="checkmark-done-outline" size={20} color="#059669" />
                  </View>
                  <View style={styles.nextStopDetails}>
                    <Text style={styles.nextStopClient}>
                      Hoja de ruta completada
                    </Text>
                    <Text style={styles.nextStopAddress}>
                      Has gestionado todos los pedidos asignados.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Botón Principal Azul Marino */}
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Volver a hoja de ruta →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardBody: {
    paddingHorizontal: 22,
    paddingTop: 24,
    paddingBottom: 22,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#EBF7EE",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  observedIconContainer: {
    backgroundColor: "#FEF2F2",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
    color: "#0F172A",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  noteBox: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#B45309",
    marginBottom: 2,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 13,
    color: "#92400E",
    fontWeight: "600",
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 24,
  },
  infoText: {
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    textAlign: "center",
  },
  nextStopSection: {
    width: "100%",
    marginBottom: 24,
  },
  nextStopLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: "uppercase",
  },
  nextStopCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  stopIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  nextStopDetails: {
    flex: 1,
  },
  nextStopClient: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  nextStopAddress: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  continueButton: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
