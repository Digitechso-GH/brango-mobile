import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, Alert, Image, Platform, TextInput, ScrollView, BackHandler, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useOrders } from "../hooks/useOrders";
import { trackingService } from "../../tracking/services/tracking.service";
import { useTrackingStore } from "../../tracking/store/useTrackingStore";
import { ORDER_STATUS } from "../constants/order-status";
import { FooterActionContainer } from "../../../shared/components/ui/FooterActionContainer";
import { PrimaryButton } from "../../../shared/components/ui/PrimaryButton";
import { AppModal } from "../../../shared/components/ui/AppModal";
import { styles } from "./OrderDetailScreen.styles";

export const OrderDetailScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const { 
    orders, 
    updateStatus, 
    uploadEvidence, 
    uploadGroupEvidence,
    isUpdatingStatus, 
    isUploadingEvidence,
    isUploadingGroupEvidence 
  } = useOrders();
  const [photo, setPhoto] = useState<string | null>(null);
  const [observationNote, setObservationNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isObserving, setIsObserving] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });
  const lastKnownLocation = useTrackingStore((state) => state.lastKnownLocation);

  const orderFromHook = orders.find((o) => o.id === orderId);
  const rawOrder = route.params?.order || orderFromHook;
  const groupedOrders = route.params?.order?.groupedOrders || 
    (rawOrder?.stopGroupId ? orders.filter((o) => o.stopGroupId === rawOrder.stopGroupId) : undefined);
  const order = rawOrder ? { ...rawOrder, groupedOrders } : null;

  const isGroupedStop = !!(order?.groupedOrders && order.groupedOrders.length > 1);
  const pendingInGroup = isGroupedStop
    ? order!.groupedOrders!.filter(
        (o: any) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT
      )
    : [];

  const isSubmitting = isConfirming || isObserving || isUpdatingStatus || isUploadingEvidence || isUploadingGroupEvidence;

  useEffect(() => {
    const onBackPress = () => {
      if (isSubmitting) {
        return true;
      }
      return false;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, [isSubmitting]);

  useEffect(() => {
    if (route.params?.photo) {
      setPhoto(route.params.photo);
    }
  }, [route.params?.photo]);

  if (!order) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Pedido no encontrado.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={styles.backButtonText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const {
    id: currentOrderId,
    code,
    client,
    waybill,
    address,
    recipientName,
    recipientPhone,
    latitude: targetLatitude,
    longitude: targetLongitude,
    evidenceUrl,
    reasonText,
    signatureText,
    status,
  } = order;

  const isPending = status === ORDER_STATUS.PENDING;
  const isInTransit = status === ORDER_STATUS.IN_TRANSIT;

  const handleTakePhoto = () => {
    navigation.navigate("Camera", { orderId: currentOrderId, order });
  };

  const ensureGpsEnabled = async (): Promise<boolean> => {
    if (Platform.OS === "android") {
      try {
        await Location.enableNetworkProviderAsync();
      } catch (e) {
        return false;
      }
    }

    if (Platform.OS === "web") return true;
    try {
      const hasServices = await Location.hasServicesEnabledAsync();
      const { status: permStatus } = await Location.getForegroundPermissionsAsync();
      return hasServices && permStatus === "granted";
    } catch (e) {
      return false;
    }
  };

  const getDestinationCoordinates = async () => {
    let latitude = lastKnownLocation?.latitude ?? targetLatitude ?? undefined;
    let longitude = lastKnownLocation?.longitude ?? targetLongitude ?? undefined;

    try {
      const currentLoc = await Promise.race([
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500))
      ]);
      if (currentLoc && currentLoc.coords) {
        latitude = currentLoc.coords.latitude;
        longitude = currentLoc.coords.longitude;
      }
    } catch (e) {
      console.log("No se pudo obtener coordenada final precisa, usando última conocida:", e);
    }

    return { latitude, longitude };
  };

  const handleConfirmDelivery = async () => {
    if (isSubmitting) return;

    if (!photo && !evidenceUrl) {
      Alert.alert("Foto requerida", "Debes tomar la evidencia de entrega (foto de la guía firmada) antes de confirmar.");
      return;
    }

    setIsConfirming(true);

    try {
      const isGpsReady = await ensureGpsEnabled();
      if (!isGpsReady) {
        setIsConfirming(false);
        return;
      }

      const { latitude, longitude } = await getDestinationCoordinates();

      const targetOrders = isGroupedStop && pendingInGroup.length > 1 ? pendingInGroup : [order];
      const targetIds = targetOrders.map((o: any) => o.id);

      const deliveryNote = observationNote.trim();
      const defaultSig = `Entregado a: ${recipientName || "Destinatario"}`;
      const sigText = deliveryNote ? `${defaultSig} — ${deliveryNote}` : defaultSig;

      if (photo) {
        if (targetIds.length > 1) {
          await uploadGroupEvidence({
            orderIds: targetIds,
            base64Image: photo,
            signatureText: `${sigText} (Parada conjunta)`,
          });
        } else {
          await uploadEvidence({
            orderId: targetIds[0],
            base64Image: photo,
            signatureText: sigText,
          });
        }
      }

      trackingService.stopTracking();

      for (const tgt of targetOrders) {
        await updateStatus({
          orderId: tgt.id,
          status: ORDER_STATUS.DELIVERED,
          latitude,
          longitude,
          reasonText: deliveryNote || undefined,
        });
      }

      navigation.replace("Success", {
        orderId: currentOrderId,
        client: targetOrders.map((o: any) => o.client).join(" / "),
        guia: targetOrders.map((o: any) => o.waybill).filter(Boolean).join(", "),
        isObserved: false,
      });
    } catch (err: any) {
      setErrorModal({ visible: true, message: err.message || "No se pudo confirmar la entrega." });
      setIsConfirming(false);
    }
  };

  const handleReportObservation = () => {
    if (isSubmitting) return;

    if (!observationNote.trim()) {
      Alert.alert("Nota requerida", "Ingresa una nota breve explicando la incidencia u observación antes de reportar.");
      return;
    }

    Alert.alert(
      "Reportar Incidencia",
      "¿Deseas marcar este pedido como OBSERVADO con la nota ingresada?",
      [
        { text: "Cancelar", style: "cancel" },
        { text: "Sí, Reportar", style: "destructive", onPress: executeObserve },
      ]
    );
  };

  const executeObserve = async () => {
    setIsObserving(true);

    try {
      const isGpsReady = await ensureGpsEnabled();
      if (!isGpsReady) {
        setIsObserving(false);
        return;
      }

      const { latitude, longitude } = await getDestinationCoordinates();

      if (photo) {
        try {
          await uploadEvidence({
            orderId: currentOrderId,
            base64Image: photo,
            signatureText: `Incidencia: ${observationNote.trim()}`,
          });
        } catch (e) {
          console.log("No se pudo adjuntar foto en observación:", e);
        }
      }

      trackingService.stopTracking();
      await updateStatus({
        orderId: currentOrderId,
        status: ORDER_STATUS.OBSERVED,
        latitude,
        longitude,
        reasonText: observationNote.trim() || undefined,
      });

      navigation.replace("Success", {
        orderId: currentOrderId,
        client,
        guia: waybill,
        isObserved: true,
        note: observationNote.trim() || "Pedido marcado como observado por el chofer.",
      });
    } catch (err: any) {
      setErrorModal({ visible: true, message: err.message || "No se pudo reportar la observación." });
      setIsObserving(false);
    }
  };

  const currentPhoto = photo || evidenceUrl || null;

  return (
    <View style={styles.container}>
      {/* Header Fijo con Flecha Negra Limpia */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.headerBackIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalle del Despacho
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Card Parada Conjunta si hay múltiples pedidos */}
        {isGroupedStop && order.groupedOrders && (
          <View style={[styles.card, { backgroundColor: "#F0F5FF", borderColor: "#D6E4FF" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="git-merge-outline" size={18} color="#3D5FFF" />
                <Text style={{ fontSize: 14, fontWeight: "800", color: "#1E3A8A" }}>
                  Parada Conjunta ({order.groupedOrders.length} Pedidos)
                </Text>
              </View>
              <View style={{ backgroundColor: "#DBEAFE", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#3D5FFF" }}>Misma Ubicación</Text>
              </View>
            </View>

            <Text style={{ fontSize: 12, color: "#6B7280", marginBottom: 10 }}>
              Esta parada agrupa múltiples entregas en el mismo destino. Puedes confirmar la entrega de todos con una sola foto.
            </Text>

            <View style={{ gap: 8 }}>
              {order.groupedOrders.map((sub: any, idx: number) => {
                const isDelivered = sub.status === ORDER_STATUS.DELIVERED;
                return (
                  <View
                    key={sub.id || idx}
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderWidth: 1,
                      borderColor: "#E2E8F0",
                      borderRadius: 10,
                      padding: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: "#1E293B" }}>
                          #{sub.code}
                        </Text>
                        {sub.waybill ? (
                          <Text style={{ fontSize: 11, color: "#6B7280", fontWeight: "600" }}>
                            Guía: {sub.waybill}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={{ fontSize: 11, color: "#4B5563", marginTop: 2 }}>
                        {sub.client || sub.recipientName || "Cliente"}
                      </Text>
                    </View>

                    <View>
                      {isDelivered ? (
                        <View style={{ backgroundColor: "#D1FAE5", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#059669" }}>✓ Entregado</Text>
                        </View>
                      ) : (
                        <View style={{ backgroundColor: "#F1F5F9", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B" }}>Pendiente</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Card 1: Datos Principales del Despacho (Dirección, Guía, Contacto) */}
        <View style={styles.card}>

          {/* Fila 1: Dirección de Entrega */}
          <View style={styles.tableRow}>
            <View style={styles.tableRowLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="location-outline" size={16} color="#3D5FFF" />
              </View>
              <Text style={styles.tableLabel}>Dirección</Text>
            </View>
            <Text style={[styles.tableValue, styles.tableValueAddress]}>
              {address || "Dirección no especificada"}
            </Text>
          </View>
          <View style={styles.tableRowDivider} />

          {/* Fila 2: Guía de Remisión */}
          <View style={styles.tableRow}>
            <View style={styles.tableRowLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="document-text-outline" size={16} color="#64748B" />
              </View>
              <Text style={styles.tableLabel}>Guía de Remisión</Text>
            </View>
            <Text style={styles.tableValue}>{waybill || "-"}</Text>
          </View>
          <View style={styles.tableRowDivider} />

          {/* Fila 3: Contacto Cliente */}
          <View style={styles.tableRow}>
            <View style={styles.tableRowLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="call-outline" size={16} color="#64748B" />
              </View>
              <Text style={styles.tableLabel}>Contacto Cliente</Text>
            </View>
            <Text style={styles.tableValue}>{recipientPhone || "-"}</Text>
          </View>



          {/* Banner Informativo si el pedido está Pendiente */}
          {isPending ? (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                ℹ️ Para tomar evidencias y finalizar la entrega de este pedido, debes iniciar el recorrido desde tu Hoja de Ruta.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Card 2: Evidencia Fotográfica */}
        {isInTransit || currentPhoto ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Evidencia Fotográfica de Entrega</Text>
            <Text style={styles.cardSubtitle}>
              Fotografía de la guía de remisión firmada o del paquete entregado en destino.
            </Text>

            {currentPhoto ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: currentPhoto }} style={styles.photoImage} />
                {isInTransit ? (
                  <TouchableOpacity style={styles.retakePhotoButton} onPress={handleTakePhoto} activeOpacity={0.8} disabled={isSubmitting}>
                    <Text style={styles.retakePhotoText}>📸 Volver a tomar foto</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity style={styles.takePhotoButton} onPress={handleTakePhoto} activeOpacity={0.85} disabled={isSubmitting}>
                <Text style={styles.cameraIcon}>📷</Text>
                <Text style={styles.takePhotoButtonText}>Tomar Foto de la Guía Firmada</Text>
                <Text style={styles.takePhotoSubtext}>Obligatorio para finalizar el despacho</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Card: Comentario / Nota Guardada (Visible al completar u observar) */}
        {(() => {
          const noteToDisplay = reasonText || signatureText;
          if (!noteToDisplay) return null;

          const isDelivered = status === ORDER_STATUS.DELIVERED;
          const isObserved = status === ORDER_STATUS.OBSERVED;

          const badgeBg = isDelivered ? "#DCFCE7" : isObserved ? "#FEE2E2" : "#F1F5F9";
          const iconColor = isDelivered ? "#059669" : isObserved ? "#DC2626" : "#475569";
          const iconName = isDelivered ? "checkmark-circle-outline" : isObserved ? "alert-circle-outline" : "chatbubble-ellipses-outline";
          const title = isDelivered
            ? "Nota / Comentario de Entrega"
            : isObserved
            ? "Motivo de Observación / Incidencia"
            : "Comentario Registrado";

          return (
            <View style={[styles.card, { backgroundColor: isDelivered ? "#F0FDF4" : isObserved ? "#FEF2F2" : "#F8FAFC", borderColor: isDelivered ? "#BBF7D0" : isObserved ? "#FECACA" : "#E2E8F0" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
                  <Ionicons name={iconName as any} size={16} color={iconColor} />
                </View>
                <Text style={{ fontSize: 13, fontWeight: "800", color: iconColor }}>
                  {title}
                </Text>
              </View>
              <Text style={{ fontSize: 13, color: isDelivered ? "#166534" : isObserved ? "#991B1B" : "#1E293B", lineHeight: 18, marginTop: 4 }}>
                {noteToDisplay}
              </Text>
            </View>
          );
        })()}

        {/* Card 3: Observaciones / Comentarios (Solo cuando está EN CAMINO) */}
        {isInTransit ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Comentario / Nota de Entrega u Observación</Text>
            <Text style={styles.cardSubtitle}>
              Ingresa cualquier nota importante sobre la entrega (ej. con quién se deja) o motivo de incidencia.
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Ej: Dejado en garita con vigilante, cliente ausente, etc."
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={3}
              value={observationNote}
              onChangeText={setObservationNote}
              editable={!isSubmitting}
            />
          </View>
        ) : null}
      </ScrollView>

      {/* Footer de Acciones Principales (Solo cuando está EN CAMINO) */}
      {isInTransit && (
        <FooterActionContainer>
          <View style={styles.footerButtonsRow}>
            <PrimaryButton
              title={
                isGroupedStop && pendingInGroup.length > 1
                  ? `Entregar Ambos (${pendingInGroup.length}) ✓`
                  : "Confirmar Entrega"
              }
              onPress={handleConfirmDelivery}
              isLoading={isConfirming}
              disabled={isSubmitting}
              variant="success"
              style={styles.halfBtn}
            />
            <PrimaryButton
              title="Reportar Incidencia"
              onPress={handleReportObservation}
              isLoading={isObserving}
              disabled={isSubmitting}
              variant="danger"
              style={styles.halfBtn}
            />
          </View>
        </FooterActionContainer>
      )}

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
