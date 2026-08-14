import React, { useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, BackHandler } from "react-native";
import { useOrders } from "../hooks/useOrders";

export const SuccessScreen = ({ route, navigation }: any) => {
  const { client, guia, isObserved, note } = route.params || {};
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

  const nextOrder = orders.find((o) => o.status === "PENDING" || o.status === "IN_TRANSIT");

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

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={[styles.iconContainer, isObserved && styles.observedIconContainer]}>
          <Text style={[styles.iconText, isObserved && styles.observedIconText]}>
            {isObserved ? "⚠️" : "✓"}
          </Text>
        </View>

        <Text style={styles.title}>
          {isObserved ? "Incidencia Registrada" : "Entrega Confirmada"}
        </Text>
        
        <Text style={styles.subtitle}>
          {client || "—"} {guia ? `· Guía #${guia}` : ""}
        </Text>

        {note ? (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Observación registrada:</Text>
            <Text style={styles.noteText}>{note}</Text>
          </View>
        ) : null}

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            {isObserved
              ? "La incidencia fue notificada a la Torre de Control y registrada en la hoja de ruta."
              : "La evidencia de entrega ha sido guardada y notificada correctamente."}
          </Text>
        </View>

        {nextOrder ? (
          <View style={styles.nextStopSection}>
            <Text style={styles.nextStopLabel}>SIGUIENTE PARADA</Text>
            <View style={styles.nextStopCard}>
              <View style={styles.nextStopInfo}>
                <View style={styles.stopNumberContainer}>
                  <Text style={styles.stopIcon}>📍</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.nextStopClient}>{nextOrder.client}</Text>
                  <Text style={styles.nextStopAddress}>{nextOrder.address}</Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.nextStopSection}>
            <Text style={styles.nextStopLabel}>HOJA DE RUTA</Text>
            <Text style={styles.completedText}>
              Se actualizó el estado de tu despacho. Puedes continuar con tus demás pedidos.
            </Text>
          </View>
        )}

        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueButtonText}>Volver a Hoja de Ruta →</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
  },
  card: {
    padding: 24,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 3,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  observedIconContainer: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
  },
  iconText: {
    color: "#10B981",
    fontSize: 28,
    fontWeight: "900",
  },
  observedIconText: {
    fontSize: 26,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    color: "#0F172A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 20,
  },
  noteCard: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  noteText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
    fontStyle: "normal",
    lineHeight: 18,
  },
  infoBox: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  infoText: {
    color: "#475569",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  nextStopSection: {
    width: "100%",
    marginBottom: 24,
  },
  nextStopLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  nextStopCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
  },
  nextStopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  stopNumberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  stopIcon: {
    fontSize: 13,
  },
  nextStopClient: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  nextStopAddress: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  completedText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 8,
  },
  continueButton: {
    backgroundColor: "#3D5FFF",
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
