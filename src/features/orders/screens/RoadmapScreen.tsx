import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList, ActivityIndicator, Alert, Platform, TouchableOpacity, Linking } from "react-native";
import * as Location from "expo-location";
import { useOrders } from "../hooks/useOrders";
import { useAuthStore } from "../../auth/store/useAuthStore";
import { useTrackingStore } from "../../tracking/store/useTrackingStore";
import { trackingService } from "../../tracking/services/tracking.service";
import { gpsSensorService } from "../../tracking/services/gps-sensor.service";
import { MapViewWrapper } from "../../tracking/components/MapViewWrapper";
import { GpsWarningBanner } from "../../tracking/components/GpsWarningBanner";
import { LatLng, getFullStreetPath } from "../../tracking/services/directions.service";
import { OrderCard } from "../components/OrderCard";
import { updateOrderStatus, reorderAssignments } from "../api/orders.api";
import { ORDER_STATUS } from "../constants/order-status";
import { FooterActionContainer } from "../../../shared/components/ui/FooterActionContainer";
import { PrimaryButton } from "../../../shared/components/ui/PrimaryButton";
import { AppModal } from "../../../shared/components/ui/AppModal";
import { Order } from "../types/orders.types";
import { styles } from "./RoadmapScreen.styles";

export const RoadmapScreen = ({ navigation }: any) => {
  const { orders, isLoading, refetch } = useOrders();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const lastKnownLocation = useTrackingStore((state) => state.lastKnownLocation);
  const driverId = user?.driverId || "";

  const [selectedRegion, setSelectedRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }>({
    latitude: -12.046374,
    longitude: -77.042793,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });
  const [isStartingRoute, setIsStartingRoute] = useState(false);

  // Escuchar asignación de nuevos pedidos por Socket en tiempo real
  useEffect(() => {
    const socket = trackingService.getSocket();
    if (!socket) return;

    const handleOrderAssigned = () => {
      refetch();
    };

    socket.on("order_assigned", handleOrderAssigned);
    return () => {
      socket.off("order_assigned", handleOrderAssigned);
    };
  }, [refetch]);

  // Actualizar posición GPS local y sincronizar intervalo al montar la pantalla
  useEffect(() => {
    let isMounted = true;

    trackingService.fetchConfiguredInterval();

    const syncInitialPosition = async () => {
      try {
        const coords = await gpsSensorService.getCurrentLocation();
        if (coords && isMounted) {
          useTrackingStore.getState().updateLocation({
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
        }
      } catch (err) {
        console.log("GPS no disponible o desactivado al iniciar:", err);
      }
    };

    syncInitialPosition();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filtrar pedidos según estado y ordenar los pendientes por sequenceIndex
  const pendingOrders = useMemo(() => {
    return orders
      .filter((o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT)
      .sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));
  }, [orders]);

  const deliveredOrders = useMemo(() => {
    return orders.filter(
      (o) =>
        o.status === ORDER_STATUS.DELIVERED ||
        o.status === ORDER_STATUS.OBSERVED ||
        o.status === ORDER_STATUS.FAILED
    );
  }, [orders]);

  const sortedOrders = useMemo(() => [...pendingOrders, ...deliveredOrders], [pendingOrders, deliveredOrders]);

  const activeInTransitOrder = orders.find((o) => o.status === ORDER_STATUS.IN_TRANSIT);
  const nextPendingOrder = pendingOrders.find((o) => o.status === ORDER_STATUS.PENDING);
  const targetOrder = activeInTransitOrder || nextPendingOrder;

  const [streetRouteCoordinates, setStreetRouteCoordinates] = useState<LatLng[]>([]);

  // Marcador enfocado
  const orderToDisplay = focusedOrderId ? (sortedOrders.find((o) => o.id === focusedOrderId) || null) : null;

  // Determinar el pedido seleccionado por el chofer o el pedido en tránsito activo
  const selectedOrActiveOrder = useMemo(() => {
    if (focusedOrderId) {
      return sortedOrders.find((o) => o.id === focusedOrderId) || null;
    }
    return activeInTransitOrder || null;
  }, [focusedOrderId, activeInTransitOrder, sortedOrders]);

  // Calcular waypoints de la ruta anidada (La "Serpiente" que conecta todas las paradas en orden)
  const waypointCoordinates = useMemo(() => {
    // Si estamos viendo el detalle de un pedido finalizado (aprobado/observado), NO mostrar la serpiente general
    if (orderToDisplay && ([ORDER_STATUS.DELIVERED, ORDER_STATUS.OBSERVED, ORDER_STATUS.FAILED] as string[]).includes(orderToDisplay.status)) {
      return [];
    }

    const points: LatLng[] = [];

    // 1. Agregar ubicación actual del conductor si el GPS está activo (Punto de Partida)
    if (lastKnownLocation && lastKnownLocation.latitude !== null && lastKnownLocation.longitude !== null) {
      points.push({ latitude: lastKnownLocation.latitude, longitude: lastKnownLocation.longitude });
    }

    // 2. Anidar TODOS los pedidos pendientes en el orden exacto en el que deben ser visitados (sequenceIndex)
    pendingOrders.forEach((o) => {
      if (o.latitude !== null && o.longitude !== null) {
        points.push({ latitude: o.latitude, longitude: o.longitude });
      }
    });

    return points;
  }, [pendingOrders, lastKnownLocation?.latitude, lastKnownLocation?.longitude, orderToDisplay?.status]);

  useEffect(() => {
    let isMounted = true;
    if (waypointCoordinates.length >= 2) {
      getFullStreetPath(waypointCoordinates).then((path) => {
        if (isMounted) setStreetRouteCoordinates(path);
      });
    } else {
      setStreetRouteCoordinates(waypointCoordinates);
    }
    return () => {
      isMounted = false;
    };
  }, [waypointCoordinates]);

  const checkGpsAvailability = async (): Promise<boolean> => {
    if (Platform.OS === "web") return true;
    try {
      const hasServices = await Location.hasServicesEnabledAsync();
      const { status } = await Location.getForegroundPermissionsAsync();
      return hasServices && status === "granted";
    } catch (e) {
      return false;
    }
  };

  const handleStartRoute = async () => {
    if (!targetOrder || isStartingRoute) {
      return;
    }

    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (e) {
        return;
      }
    }

    const isGpsReady = await checkGpsAvailability();
    if (!isGpsReady) {
      return;
    }

    setIsStartingRoute(true);

    try {
      let latitude = lastKnownLocation?.latitude ?? targetOrder.latitude ?? undefined;
      let longitude = lastKnownLocation?.longitude ?? targetOrder.longitude ?? undefined;

      try {
        const currentLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (currentLocation && currentLocation.coords) {
          latitude = currentLocation.coords.latitude;
          longitude = currentLocation.coords.longitude;
        }
      } catch (e) {
        console.log("No se pudo obtener posición GPS actual, usando última conocida o de pedido:", e);
      }

      if (latitude === undefined || longitude === undefined) {
        setShowGpsModal(true);
        setIsStartingRoute(false);
        return;
      }

      await updateOrderStatus({
        orderId: targetOrder.id,
        status: ORDER_STATUS.IN_TRANSIT,
        latitude,
        longitude,
      });

      setFocusedOrderId(targetOrder.id);
      await trackingService.startTracking(targetOrder.id, latitude, longitude);

      await refetch();
    } catch (error: any) {
      setErrorModal({ visible: true, message: error.message || "No se pudo iniciar el recorrido" });
    } finally {
      setIsStartingRoute(false);
    }
  };

  // Construcción de Marcadores del Mapa
  const markers: any[] = [];

  // 1. Marcador del Chofer (🚚 Carrito) - Si hay GPS activo
  if (lastKnownLocation && lastKnownLocation.latitude !== null && lastKnownLocation.longitude !== null) {
    markers.push({
      id: "driver-live-location",
      latitude: lastKnownLocation.latitude,
      longitude: lastKnownLocation.longitude,
      title: "🚚 Tu ubicación actual",
      description: "Chofer en movimiento",
      color: "#3D5FFF",
      isTruck: true,
    });
  }

  // 2. Marcadores de destinos activos (Pendientes / En tránsito)
  pendingOrders.forEach((o) => {
    if (o.latitude !== null && o.longitude !== null) {
      markers.push({
        id: `dest-${o.id}`,
        latitude: o.latitude,
        longitude: o.longitude,
        title: `${o.client} (Parada ${pendingOrders.indexOf(o) + 1})`,
        description: o.address,
        color: o.status === ORDER_STATUS.IN_TRANSIT ? "#F59E0B" : "#3D5FFF",
      });
    }
  });

  // 3. Marcador enfocado adicional (si es entregado/observado para que aparezca)
  if (orderToDisplay && orderToDisplay.status !== ORDER_STATUS.PENDING && orderToDisplay.status !== ORDER_STATUS.IN_TRANSIT) {
    if (orderToDisplay.latitude !== null && orderToDisplay.longitude !== null) {
      markers.push({
        id: `dest-focused-${orderToDisplay.id}`,
        latitude: orderToDisplay.latitude,
        longitude: orderToDisplay.longitude,
        title: `${orderToDisplay.client} (Entregado/Observado)`,
        description: orderToDisplay.address,
        color: orderToDisplay.status === ORDER_STATUS.DELIVERED ? "#10B981" : "#EF4444",
      });
    }
  }

  const handleFocusOrder = (order: Order) => {
    if (order.latitude !== null && order.longitude !== null) {
      setFocusedOrderId(order.id);
      setSelectedRegion({
        latitude: order.latitude,
        longitude: order.longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
      });
    } else {
      Alert.alert("Ubicación no disponible", "Este pedido no cuenta con coordenadas de mapa válidas.");
    }
  };

  const handleSelectOrder = (orderId: string) => {
    navigation.navigate("OrderDetail", { orderId });
  };

  // Reordenar Prioridad Arriba
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reorderedList = [...pendingOrders];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[index - 1];
    reorderedList[index - 1] = temp;

    const ids = reorderedList.map((o) => o.id);
    try {
      await reorderAssignments(driverId, ids);
      await refetch();
    } catch (err: any) {
      Alert.alert("Error al reordenar", err.message || "Inténtalo de nuevo.");
    }
  };

  // Reordenar Prioridad Abajo
  const handleMoveDown = async (index: number) => {
    if (index === pendingOrders.length - 1) return;
    const reorderedList = [...pendingOrders];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[index + 1];
    reorderedList[index + 1] = temp;

    const ids = reorderedList.map((o) => o.id);
    try {
      await reorderAssignments(driverId, ids);
      await refetch();
    } catch (err: any) {
      Alert.alert("Error al reordenar", err.message || "Inténtalo de nuevo.");
    }
  };

  // Cierre de Jornada (Logout): se deshabilita si hay pedidos pendientes o en tránsito
  const handleFinalizeShift = () => {
    Alert.alert(
      "Finalizar Jornada",
      "¿Estás seguro que deseas cerrar tu jornada y salir?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Cerrar", style: "destructive", onPress: () => logout() },
      ]
    );
  };

  const isShiftFinalizable = pendingOrders.length === 0;

  return (
    <View style={styles.container}>
      {/* Header Compacto */}
      <View style={styles.header}>
        <Text style={styles.welcomeText}>¡Hola, {user?.name || "Conductor"}!</Text>
        <TouchableOpacity
          onPress={handleFinalizeShift}
          disabled={!isShiftFinalizable}
          style={[styles.logoutBtn, !isShiftFinalizable && styles.logoutBtnDisabled]}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutBtnText}>Cerrar Jornada</Text>
        </TouchableOpacity>
      </View>

      {/* Banner de Advertencia de GPS */}
      <GpsWarningBanner />

      <MapViewWrapper
        style={styles.map}
        initialRegion={selectedRegion}
        markers={markers}
        routeCoordinates={streetRouteCoordinates}
      />

      <View style={styles.listContainer}>
        {/* Cabecera: Hoja de Ruta a la izquierda, Pendientes a la derecha */}
        <View style={styles.listHeaderRow}>
          <Text style={styles.sectionTitle}>Hoja de Ruta</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{pendingOrders.length} Pendientes</Text>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3D5FFF" />
            <Text style={styles.loadingText}>Cargando hoja de ruta...</Text>
          </View>
        ) : sortedOrders.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sin pedidos asignados</Text>
            <Text style={styles.emptySubtitle}>No tienes entregas pendientes en tu hoja de ruta actualmente.</Text>
          </View>
        ) : (
          <FlatList
            data={sortedOrders}
            keyExtractor={(item) => item.id}
            refreshing={isLoading}
            onRefresh={refetch}
            renderItem={({ item, index }) => {
              const isLocked = activeInTransitOrder && item.id !== activeInTransitOrder.id && item.status === ORDER_STATUS.PENDING;
              
              const isPending = item.status === ORDER_STATUS.PENDING;
              const pendingIndex = pendingOrders.findIndex((o) => o.id === item.id);

              return (
                <OrderCard
                  order={item}
                  index={index}
                  isActive={item.id === orderToDisplay?.id}
                  isLocked={!!isLocked}
                  onFocusOrder={handleFocusOrder}
                  onSelectOrder={handleSelectOrder}
                  onMoveUp={
                    isPending && pendingIndex > 0 ? () => handleMoveUp(pendingIndex) : undefined
                  }
                  onMoveDown={
                    isPending && pendingIndex < pendingOrders.length - 1
                      ? () => handleMoveDown(pendingIndex)
                      : undefined
                  }
                />
              );
            }}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <FooterActionContainer>
        <PrimaryButton
          title={
            isStartingRoute
              ? "Iniciando Recorrido..."
              : activeInTransitOrder
              ? "Recorrido en Curso"
              : !nextPendingOrder
              ? "No hay pedidos pendientes"
              : "Iniciar Recorrido ▶"
          }
          onPress={handleStartRoute}
          isLoading={isStartingRoute}
          disabled={!nextPendingOrder || !!activeInTransitOrder || isStartingRoute}
          variant="primary"
        />
      </FooterActionContainer>

      <AppModal
        visible={showGpsModal}
        title="GPS no disponible"
        message="Activa el GPS de tu dispositivo o permite el acceso a tu ubicación para registrar el inicio del recorrido."
        icon="📍"
        buttonTitle="Abrir Configuración"
        onConfirm={() => {
          setShowGpsModal(false);
          Linking.openSettings();
        }}
        onCancel={() => setShowGpsModal(false)}
      />

      <AppModal
        visible={errorModal.visible}
        title="Error Operativo"
        message={errorModal.message}
        icon="⚠️"
        buttonTitle="Entendido"
        onConfirm={() => setErrorModal({ visible: false, message: "" })}
      />
    </View>
  );
};
