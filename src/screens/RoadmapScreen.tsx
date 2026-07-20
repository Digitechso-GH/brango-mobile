import React from "react";
import { StyleSheet, View, Text, FlatList, TouchableOpacity, ActivityIndicator, Image } from "react-native";
import { useOrders } from "../hooks/useOrders";
import { useStore } from "../store/useStore";

export const RoadmapScreen = ({ navigation }: any) => {
  const { orders, isLoading, refetch } = useOrders();
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "IN_TRANSIT": return { bg: "#FFFBEB", text: "#D97706", label: "En camino" };
      case "DELIVERED": return { bg: "#ECFDF5", text: "#059669", label: "Entregado" };
      case "OBSERVED": return { bg: "#FEF2F2", text: "#DC2626", label: "Observado" };
      default: return { bg: "#F1F5F9", text: "#475569", label: "Pendiente" };
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const badge = getStatusBadgeColor(item.status);
    
    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate("OrderDetail", { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>{item.id}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
          </View>
        </View>
        
        <Text style={styles.client}>{item.client}</Text>
        <Text style={styles.address}>{item.address}</Text>
        {item.guia && <Text style={styles.guia}>Guía: #{item.guia}</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.welcome}>Hola, {user?.name}</Text>
          <Text style={styles.plate}>Vehículo: {user?.plate}</Text>
        </View>
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Text style={styles.logoutText}>Salir</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#3D5FFF" />
          <Text style={styles.loadingText}>Cargando hoja de ruta...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.listContent}
          refreshing={isLoading}
          onRefresh={refetch}
          ListEmptyComponent={
            <View style={styles.center}>
              <Text style={styles.emptyText}>No tienes pedidos asignados hoy.</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  welcome: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  plate: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  logoutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    gap: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  orderId: {
    fontSize: 14,
    fontWeight: "800",
    color: "#3D5FFF",
    fontFamily: "monospace",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  client: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
  },
  address: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    lineHeight: 18,
  },
  guia: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 8,
    fontFamily: "monospace",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    color: "#64748B",
    fontSize: 14,
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
  },
});
