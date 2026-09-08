import React, { useState, useEffect, useMemo, useCallback } from "react";
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
import { OrderCard, RouteCard, RouteGroup } from "../components/OrderCard";
import { updateOrderStatus, reorderAssignments, completeRoute } from "../api/orders.api";
import { ORDER_STATUS, mapStatusFromBackend } from "../constants/order-status";
import { FooterActionContainer } from "../../../shared/components/ui/FooterActionContainer";
import { PrimaryButton } from "../../../shared/components/ui/PrimaryButton";
import { AppModal } from "../../../shared/components/ui/AppModal";
import { Order } from "../types/orders.types";
import { styles } from "./RoadmapScreen.styles";
import { apiClient } from "../../../shared/api/client";
import { API_ENDPOINTS } from "../../../shared/constants/routes";

function consolidateOrdersIntoStops(rawOrders: Order[]): Order[] {
  const groupsMap = new Map<string, Order[]>();
  const nonGrouped: Order[] = [];

  // ÚNICAMENTE agrupar si el administrador lo consolidó manualmente (stopGroupId)
  for (const o of rawOrders) {
    if (o.stopGroupId) {
      if (!groupsMap.has(o.stopGroupId)) {
        groupsMap.set(o.stopGroupId, []);
      }
      groupsMap.get(o.stopGroupId)!.push(o);
    } else {
      nonGrouped.push(o);
    }
  }

  const stops: Order[] = [];

  for (const [groupId, items] of groupsMap.entries()) {
    const first = items[0];
    const anyInTransit = items.some((i) => i.status === ORDER_STATUS.IN_TRANSIT);
    const allDelivered = items.every((i) => i.status === ORDER_STATUS.DELIVERED);
    const anyObserved = items.some(
      (i) => i.status === ORDER_STATUS.OBSERVED || i.status === ORDER_STATUS.FAILED
    );

    let status = first.status;
    if (anyInTransit) {
      status = ORDER_STATUS.IN_TRANSIT;
    } else if (allDelivered) {
      status = ORDER_STATUS.DELIVERED;
    } else if (anyObserved) {
      status = ORDER_STATUS.OBSERVED;
    }

    const minSeq = Math.min(
      ...items.map((i) => (typeof i.sequenceIndex === "number" && i.sequenceIndex > 0 ? i.sequenceIndex : 999999))
    );

    stops.push({
      ...first,
      id: first.id,
      stopGroupId: groupId,
      groupedOrders: items,
      code: items.map((i) => i.code).join(", "),
      waybill: items.map((i) => i.waybill).filter(Boolean).join(", "),
      status,
      sequenceIndex: minSeq === 999999 ? 0 : minSeq,
    });
  }

  for (const o of nonGrouped) {
    stops.push({
      ...o,
      groupedOrders: [o],
    });
  }

  return stops.sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));
}

export const RoadmapScreen = ({ navigation }: any) => {
  const { orders, isLoading, refetch } = useOrders();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const lastKnownLocation = useTrackingStore((state) => state.lastKnownLocation);
  const driverId = user?.driverId || "";

  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

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

  const [realBackendRoutes, setRealBackendRoutes] = useState<RouteGroup[]>([]);
  const [isLoadingBackendRoutes, setIsLoadingBackendRoutes] = useState(false);

  const parseNumberCoordinate = (val: any): number | null => {
    if (val === null || val === undefined || val === "") return null;
    const num = typeof val === "number" ? val : parseFloat(val);
    return isNaN(num) ? null : num;
  };

  const fetchRealRoutes = useCallback(async () => {
    try {
      setIsLoadingBackendRoutes(true);
      const params: any = {};
      if (driverId) {
        params.driverId = driverId;
      }
      const res = await apiClient.get(API_ENDPOINTS.ROUTES.MOBILE, { params });
      const payload = res.data?.success !== undefined ? res.data.data : res.data;
      
      if (!Array.isArray(payload)) {
        setRealBackendRoutes([]);
        return;
      }

      // Mostrar todas las rutas de la jornada del día (pendientes, en progreso y completadas)
      const groups: RouteGroup[] = payload.map((r: any): RouteGroup => {
        const activeAssignments = (r.assignments || []).filter((a: any) => !a.voidedAt);
        const mappedOrders: Order[] = activeAssignments.map((a: any) => {
          const o = a.order || {};
          const routeAssignmentId = String(a.id);
          const displayAddress = o.formattedAddress || o.rawAddress || "—";
          const displayClient = (o.customer?.name || o.recipientName || "—").trim();

          const rawEvidence = a.evidences && a.evidences.length > 0 
            ? a.evidences[0].s3Url 
            : (o.evidences && o.evidences.length > 0 ? o.evidences[0].s3Url : "");

          return {
            id: routeAssignmentId,
            code: o.code || "",
            waybill: o.waybill || "",
            client: displayClient,
            recipientName: o.recipientName || "",
            recipientDoc: o.recipientDocument || "",
            recipientPhone: o.recipientPhone || "",
            warehouseContact: o.warehouseContact || "",
            address: displayAddress,
            rawAddress: o.rawAddress || "",
            formattedAddress: o.formattedAddress || null,
            status: mapStatusFromBackend(a.status),
            rawState: a.status,
            reasonText: a.reasonText || a.evidences?.[0]?.signatureText || null,
            signatureText: a.evidences?.[0]?.signatureText || null,
            latitude: parseNumberCoordinate(o.latitude),
            longitude: parseNumberCoordinate(o.longitude),
            originText: a.originAddress || null,
            originLatitude: parseNumberCoordinate(a.originLatitude),
            originLongitude: parseNumberCoordinate(a.originLongitude),
            evidenceUrl: rawEvidence,
            updatedAt: a.updatedAt ?? o.updatedAt,
            sequenceIndex: a.sequenceIndex ?? 0,
            stopGroupId: a.stopGroupId || null,
          };
        });

        const total = mappedOrders.length;
        const pendingCount = mappedOrders.filter(
          (o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT
        ).length;
        const completedCount = mappedOrders.filter((o) => o.status === ORDER_STATUS.DELIVERED).length;
        const observedCount = mappedOrders.filter(
          (o) => o.status === ORDER_STATUS.OBSERVED || o.status === ORDER_STATUS.FAILED
        ).length;

        const hasInTransit = mappedOrders.some((o) => o.status === ORDER_STATUS.IN_TRANSIT);
        const isCompleted = r.status === "COMPLETED" || (total > 0 && pendingCount === 0 && observedCount === 0);

        const routeStatus = hasInTransit
          ? "IN_TRANSIT"
          : isCompleted
          ? "COMPLETED"
          : "PENDING";

        return {
          id: String(r.id),
          name: r.name || `Ruta #${r.sequenceIndex || 1}`,
          status: routeStatus,
          date: r.date,
          sequenceIndex: r.sequenceIndex ?? 1,
          orders: mappedOrders,
          totalOrders: total,
          pendingOrders: pendingCount,
          completedOrders: completedCount,
          observedOrders: observedCount,
        };
      });

      setRealBackendRoutes(groups);
    } catch (err) {
      console.log("Error al consultar rutas reales del chofer desde el servidor:", err);
      setRealBackendRoutes([]);
    } finally {
      setIsLoadingBackendRoutes(false);
    }
  }, [driverId]);

  // Escuchar asignación de nuevos pedidos por Socket en tiempo real
  useEffect(() => {
    const socket = trackingService.getSocket();
    if (!socket) return;

    const handleOrderAssigned = () => {
      refetch();
      fetchRealRoutes(); // <--- Fuerza el refresco de las rutas reales inmediatamente
    };

    socket.on("order_assigned", handleOrderAssigned);
    return () => {
      socket.off("order_assigned", handleOrderAssigned);
    };
  }, [refetch, fetchRealRoutes]);

  useEffect(() => {
    fetchRealRoutes();
  }, [fetchRealRoutes, orders]);

  const routeGroups = realBackendRoutes;

  const selectedRoute = useMemo(() => {
    if (!selectedRouteId) return null;
    return routeGroups.find((r) => r.id === selectedRouteId) || null;
  }, [routeGroups, selectedRouteId]);

  const activeOrdersForView = useMemo(() => {
    const raw = selectedRoute ? selectedRoute.orders : sortedOrders;
    return consolidateOrdersIntoStops(raw);
  }, [selectedRoute, sortedOrders]);

  // Pedidos activos/pendientes acotados a la ruta seleccionada (o a todos si está en vista general)
  const currentRoutePendingOrders = useMemo(() => {
    return activeOrdersForView.filter(
      (o) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT
    );
  }, [activeOrdersForView]);

  const currentRouteInTransitOrder = useMemo(() => {
    if (selectedRoute) {
      return selectedRoute.orders.find((o) => o.status === ORDER_STATUS.IN_TRANSIT) || null;
    }
    return orders.find((o) => o.status === ORDER_STATUS.IN_TRANSIT) || null;
  }, [selectedRoute, orders]);

  const currentRouteNextPendingOrder = useMemo(() => {
    return currentRoutePendingOrders.find((o) => o.status === ORDER_STATUS.PENDING) || null;
  }, [currentRoutePendingOrders]);

  const targetOrder = currentRouteInTransitOrder || currentRouteNextPendingOrder;

  const isCurrentRouteCompleted = useMemo(() => {
    if (!selectedRoute) return false;
    if (selectedRoute.status === "COMPLETED") return true;
    return selectedRoute.orders.length > 0 && currentRoutePendingOrders.length === 0;
  }, [selectedRoute, currentRoutePendingOrders]);

  const isSelectedRouteForToday = useMemo(() => {
    if (!selectedRoute || !selectedRoute.date) return false;
    
    // Obtener la fecha actual artificialmente centrada en America/Lima (UTC-5 fijo)
    const nowUTC = Date.now();
    const limaOffsetMs = -5 * 60 * 60 * 1000;
    const limaTime = new Date(nowUTC + limaOffsetMs);
    const todayLimaStr = limaTime.toISOString().split('T')[0]; // ej: "2026-09-03"

    // La fecha de la ruta desde backend (ej: "2026-09-03T05:00:00.000Z")
    const routeDateStr = selectedRoute.date.split('T')[0];

    return todayLimaStr === routeDateStr;
  }, [selectedRoute]);

  // Validar si el chofer tiene rutas previas abiertas sin cerrar
  // Separación estricta:
  // (a) Cualquier fecha anterior bloquea sin importar el sequenceIndex.
  // (b) Misma fecha compara por sequenceIndex menor.
  const hasUnclosedPriorRoute = useMemo(() => {
    if (!selectedRoute || !selectedRoute.date) return false;

    const selectedDateStr = selectedRoute.date.split("T")[0];
    const selectedSeq = selectedRoute.sequenceIndex ?? 1;

    return routeGroups.some((r) => {
      if (r.id === selectedRoute.id) return false;

      // Verificar si la ruta tiene pedidos activos pendientes o en tránsito
      const isOpen = r.status !== "COMPLETED" && (r.pendingOrders > 0 || r.status === "IN_TRANSIT");
      if (!isOpen) return false;

      const rDateStr = r.date.split("T")[0];
      const rSeq = r.sequenceIndex ?? 1;

      // Condición A: Fecha estrictamente anterior (bloquea sin importar sequenceIndex)
      if (rDateStr < selectedDateStr) {
        return true;
      }

      // Condición B: Misma fecha, pero sequenceIndex menor
      if (rDateStr === selectedDateStr && rSeq < selectedSeq) {
        return true;
      }

      return false;
    });
  }, [selectedRoute, routeGroups]);

  const [streetRouteCoordinates, setStreetRouteCoordinates] = useState<LatLng[]>([]);

  // Marcador enfocado
  const orderToDisplay = focusedOrderId
    ? (activeOrdersForView.find((o) => o.id === focusedOrderId) || null)
    : null;

  // Centrar mapa al seleccionar una ruta
  useEffect(() => {
    if (selectedRoute && selectedRoute.orders.length > 0) {
      const ordersWithCoords = selectedRoute.orders.filter(
        (o) => o.latitude !== null && o.longitude !== null
      );
      if (ordersWithCoords.length > 0) {
        const allLats = ordersWithCoords.map((o) => o.latitude!);
        const allLngs = ordersWithCoords.map((o) => o.longitude!);
        if (lastKnownLocation?.latitude && lastKnownLocation?.longitude) {
          allLats.push(lastKnownLocation.latitude);
          allLngs.push(lastKnownLocation.longitude);
        }
        const minLat = Math.min(...allLats);
        const maxLat = Math.max(...allLats);
        const minLng = Math.min(...allLngs);
        const maxLng = Math.max(...allLngs);

        setSelectedRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.03),
          longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.03),
        });
      }
    }
  }, [selectedRouteId, selectedRoute, lastKnownLocation?.latitude, lastKnownLocation?.longitude]);

  // Calcular waypoints de la ruta (La "Serpiente" que conecta las paradas en orden)
  const waypointCoordinates = useMemo(() => {
    // Si la ruta está completada o no hay pedidos pendientes, NO dibujar serpiente
    if (isCurrentRouteCompleted || currentRoutePendingOrders.length === 0) {
      return [];
    }

    // Si estamos viendo el detalle de un pedido finalizado (aprobado/observado), NO mostrar serpiente
    if (orderToDisplay && ([ORDER_STATUS.DELIVERED, ORDER_STATUS.OBSERVED, ORDER_STATUS.FAILED] as string[]).includes(orderToDisplay.status)) {
      return [];
    }

    const points: LatLng[] = [];

    // 1. Agregar ubicación actual del conductor si el GPS está activo (Punto de Partida)
    if (lastKnownLocation && lastKnownLocation.latitude !== null && lastKnownLocation.longitude !== null) {
      points.push({ latitude: lastKnownLocation.latitude, longitude: lastKnownLocation.longitude });
    }

    // 2. Anidar los pedidos pendientes de la ruta actual
    currentRoutePendingOrders.forEach((o) => {
      if (o.latitude !== null && o.longitude !== null) {
        points.push({ latitude: o.latitude, longitude: o.longitude });
      }
    });

    return points;
  }, [isCurrentRouteCompleted, currentRoutePendingOrders, orderToDisplay?.status, lastKnownLocation?.latitude, lastKnownLocation?.longitude]);

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
        const currentLocation = await Promise.race([
          Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
        ]);
        if (currentLocation && currentLocation.coords) {
          latitude = currentLocation.coords.latitude;
          longitude = currentLocation.coords.longitude;
        } else if (latitude === undefined || longitude === undefined) {
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown && lastKnown.coords) {
            latitude = lastKnown.coords.latitude;
            longitude = lastKnown.coords.longitude;
          }
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

      await Promise.all([refetch(), fetchRealRoutes()]);
    } catch (error: any) {
      setErrorModal({ visible: true, message: error.message || "No se pudo iniciar el recorrido" });
    } finally {
      setIsStartingRoute(false);
    }
  };

  // Construcción de Marcadores del Mapa (Filtrados estrictamente por la ruta seleccionada)
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

  // 2. Destinos: si hay una ruta seleccionada, mostrar EXCLUSIVAMENTE los pedidos de esa ruta
  if (selectedRoute) {
    // Detectar pedidos con coordenadas idénticas para evitar que se tapen en el mapa
    const coordCounts = new Map<string, number>();
    const coordIndices = new Map<string, number>();

    activeOrdersForView.forEach((o) => {
      if (o.latitude !== null && o.longitude !== null) {
        const key = `${o.latitude.toFixed(5)}_${o.longitude.toFixed(5)}`;
        coordCounts.set(key, (coordCounts.get(key) || 0) + 1);
      }
    });

    activeOrdersForView.forEach((o, index) => {
      if (o.latitude !== null && o.longitude !== null) {
        const stopNumber = (typeof o.sequenceIndex === "number" && o.sequenceIndex > 0)
          ? o.sequenceIndex
          : (index + 1);

        let markerColor = "#3D5FFF"; // PENDING
        let statusLabel = `Parada ${stopNumber}`;

        if (o.status === ORDER_STATUS.IN_TRANSIT) {
          markerColor = "#F59E0B";
          statusLabel = "En Tránsito";
        } else if (o.status === ORDER_STATUS.DELIVERED) {
          markerColor = "#10B981";
          statusLabel = "Entregado";
        } else if (o.status === ORDER_STATUS.OBSERVED || o.status === ORDER_STATUS.FAILED) {
          markerColor = "#EF4444";
          statusLabel = "Observado";
        }

        const packageCount = o.groupedOrders?.length || 1;
        const groupNote = packageCount > 1 ? ` · ${packageCount} pedidos` : "";

        // Si dos pedidos no consolidados tienen la misma coordenada exacta, desplazarlos ~18m para que no se tapen
        const key = `${o.latitude.toFixed(5)}_${o.longitude.toFixed(5)}`;
        const totalAtCoord = coordCounts.get(key) || 1;
        let offsetLng = 0;
        if (totalAtCoord > 1) {
          const currentIdx = coordIndices.get(key) || 0;
          coordIndices.set(key, currentIdx + 1);
          offsetLng = (currentIdx - (totalAtCoord - 1) / 2) * 0.00018;
        }

        markers.push({
          id: `dest-${o.id}`,
          latitude: o.latitude,
          longitude: o.longitude + offsetLng,
          title: `${o.client} (${statusLabel}${groupNote})`,
          description: o.address,
          color: markerColor,
          label: stopNumber,
          badgeCount: packageCount > 1 ? packageCount : undefined,
        });
      }
    });
  } else {
    // Modo vista general de rutas: mostrar pedidos pendientes de todas las rutas
    pendingOrders.forEach((o, index) => {
      if (o.latitude !== null && o.longitude !== null) {
        const stopNumber = (typeof o.sequenceIndex === "number" && o.sequenceIndex > 0)
          ? o.sequenceIndex
          : (index + 1);

        markers.push({
          id: `dest-${o.id}`,
          latitude: o.latitude,
          longitude: o.longitude,
          title: `${o.client} (Pendiente)`,
          description: o.address,
          color: o.status === ORDER_STATUS.IN_TRANSIT ? "#F59E0B" : "#3D5FFF",
          label: stopNumber,
        });
      }
    });
  }

  const handleFocusOrder = (order: Order) => {
    if (order.latitude !== null && order.longitude !== null) {
      setFocusedOrderId(order.id);
      
      if (lastKnownLocation && lastKnownLocation.latitude !== null && lastKnownLocation.longitude !== null) {
        const minLat = Math.min(lastKnownLocation.latitude, order.latitude);
        const maxLat = Math.max(lastKnownLocation.latitude, order.latitude);
        const minLng = Math.min(lastKnownLocation.longitude, order.longitude);
        const maxLng = Math.max(lastKnownLocation.longitude, order.longitude);
        
        setSelectedRegion({
          latitude: (minLat + maxLat) / 2,
          longitude: (minLng + maxLng) / 2,
          latitudeDelta: Math.max((maxLat - minLat) * 1.5, 0.02),
          longitudeDelta: Math.max((maxLng - minLng) * 1.5, 0.02),
        });
      } else {
        setSelectedRegion({
          latitude: order.latitude,
          longitude: order.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    } else {
      Alert.alert("Ubicación no disponible", "Este pedido no cuenta con coordenadas de mapa válidas.");
    }
  };

  const handleSelectOrder = (orderId: string) => {
    const selectedItem =
      activeOrdersForView.find((o) => o.id === orderId) ||
      orders.find((o) => o.id === orderId);
    navigation.navigate("OrderDetail", { orderId, order: selectedItem });
  };

  // Reordenar Prioridad Arriba
  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const reorderedList = [...currentRoutePendingOrders];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[index - 1];
    reorderedList[index - 1] = temp;

    const ids = reorderedList.flatMap((stop) =>
      stop.groupedOrders && stop.groupedOrders.length > 0
        ? stop.groupedOrders.map((o) => o.id)
        : [stop.id]
    );
    try {
      await reorderAssignments(driverId, ids);
      await Promise.all([refetch(), fetchRealRoutes()]);
    } catch (err: any) {
      Alert.alert("Error al reordenar", err.message || "Inténtalo de nuevo.");
    }
  };

  // Reordenar Prioridad Abajo
  const handleMoveDown = async (index: number) => {
    if (index === currentRoutePendingOrders.length - 1) return;
    const reorderedList = [...currentRoutePendingOrders];
    const temp = reorderedList[index];
    reorderedList[index] = reorderedList[index + 1];
    reorderedList[index + 1] = temp;

    const ids = reorderedList.flatMap((stop) =>
      stop.groupedOrders && stop.groupedOrders.length > 0
        ? stop.groupedOrders.map((o) => o.id)
        : [stop.id]
    );
    try {
      await reorderAssignments(driverId, ids);
      await Promise.all([refetch(), fetchRealRoutes()]);
    } catch (err: any) {
      Alert.alert("Error al reordenar", err.message || "Inténtalo de nuevo.");
    }
  };

  const activeRoute = useMemo(() => {
    return routeGroups.find((r) => r.status === "IN_TRANSIT" || r.status === "PENDING") || null;
  }, [routeGroups]);

  const isShiftFinalizable = useMemo(() => {
    const routeToClose = selectedRoute || activeRoute;
    if (!routeToClose) return false;
    if (routeToClose.status === "COMPLETED") return false;
    // Si la ruta tiene una ruta previa abierta, no se puede cerrar antes que la anterior
    if (hasUnclosedPriorRoute) return false;
    return !routeToClose.orders.some((o: Order) => o.status === ORDER_STATUS.IN_TRANSIT);
  }, [selectedRoute, activeRoute, hasUnclosedPriorRoute]);

  // Cierre de Jornada (Logout): Llama al endpoint de cierre por Ruta y luego desloguea
  const handleFinalizeShift = () => {
    const routeToClose = selectedRoute || activeRoute;

    Alert.alert(
      "Finalizar Jornada",
      "¿Estás seguro que deseas cerrar tu jornada y salir? Los pedidos pendientes de tu ruta activa pasarán a Observado.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Sí, Cerrar", 
          style: "destructive", 
          onPress: async () => {
            if (routeToClose) {
              try {
                await completeRoute(routeToClose.id);
                await Promise.all([refetch(), fetchRealRoutes()]);
                Alert.alert("Jornada Finalizada", "Se ha cerrado la ruta actual correctamente.");
              } catch (err: any) {
                Alert.alert("Error", err.message || "No se pudo cerrar la ruta. Inténtalo de nuevo.");
                return;
              }
            }
          } 
        },
      ]
    );
  };

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
        {/* Cabecera dinámica: Rutas Asignadas vs Pedidos de la Ruta */}
        <View style={styles.listHeaderRow}>
          {selectedRoute ? (
            <>
              <TouchableOpacity
                onPress={() => setSelectedRouteId(null)}
                style={styles.backToRoutesBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.backToRoutesText}>← Rutas</Text>
              </TouchableOpacity>
              <Text style={styles.sectionTitle}>{selectedRoute.name}</Text>
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>Rutas Asignadas</Text>
              <View style={styles.countBadge}>
                <Text style={styles.countBadgeText}>{routeGroups.length} {routeGroups.length === 1 ? "Ruta" : "Rutas"}</Text>
              </View>
            </>
          )}
        </View>

        {isLoading || isLoadingBackendRoutes ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#3D5FFF" />
            <Text style={styles.loadingText}>Cargando información...</Text>
          </View>
        ) : routeGroups.length === 0 ? (
          <View style={styles.centerBox}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>Sin rutas ni pedidos asignados</Text>
            <Text style={styles.emptySubtitle}>No tienes entregas pendientes en tu jornada actualmente.</Text>
          </View>
        ) : !selectedRoute ? (
          /* MODO 1: Cartillas de Rutas Asignadas */
          <FlatList
            data={routeGroups}
            keyExtractor={(item) => item.id}
            refreshing={isLoading || isLoadingBackendRoutes}
            onRefresh={() => Promise.all([refetch(), fetchRealRoutes()])}
            renderItem={({ item }) => (
              <RouteCard
                route={item}
                onSelectRoute={(id) => setSelectedRouteId(id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          /* MODO 2: Pedidos de la Ruta Seleccionada */
          <FlatList
            data={activeOrdersForView}
            keyExtractor={(item) => item.id}
            refreshing={isLoading || isLoadingBackendRoutes}
            onRefresh={() => Promise.all([refetch(), fetchRealRoutes()])}
            renderItem={({ item, index }) => {
              const isLocked = currentRouteInTransitOrder && item.id !== currentRouteInTransitOrder.id && item.status === ORDER_STATUS.PENDING;
              
              const isPending = item.status === ORDER_STATUS.PENDING;
              const pendingIndex = currentRoutePendingOrders.findIndex((o) => o.id === item.id);

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
                    isPending && pendingIndex < currentRoutePendingOrders.length - 1
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

      {selectedRoute && (
        <FooterActionContainer>
          {hasUnclosedPriorRoute ? (
            <PrimaryButton
              title="Cierra tu ruta anterior primero"
              onPress={() => {}}
              disabled={true}
              variant="primary"
            />
          ) : isCurrentRouteCompleted ? (
            <PrimaryButton
              title="Ruta Finalizada ✓"
              onPress={() => {}}
              disabled={true}
              variant="primary"
            />
          ) : !isSelectedRouteForToday ? (
            <PrimaryButton
              title="Ruta Inhabilitada"
              onPress={() => {}}
              disabled={true}
              variant="primary"
            />
          ) : (
            <PrimaryButton
              title={
                isStartingRoute
                  ? "Iniciando Recorrido..."
                  : currentRouteInTransitOrder
                  ? "Recorrido en Curso"
                  : orderToDisplay && orderToDisplay.status !== ORDER_STATUS.PENDING
                  ? "Pedido ya gestionado"
                  : !currentRouteNextPendingOrder
                  ? "No hay pedidos pendientes"
                  : "Iniciar Recorrido ▶"
              }
              onPress={handleStartRoute}
              isLoading={isStartingRoute}
              disabled={
                isStartingRoute ||
                !!currentRouteInTransitOrder ||
                (!!orderToDisplay && orderToDisplay.status !== ORDER_STATUS.PENDING) ||
                (!orderToDisplay && !currentRouteNextPendingOrder)
              }
              variant="primary"
            />
          )}
        </FooterActionContainer>
      )}

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
