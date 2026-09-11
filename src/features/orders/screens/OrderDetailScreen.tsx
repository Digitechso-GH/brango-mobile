import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  TextInput,
  ScrollView,
  BackHandler,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useOrders } from "../hooks/useOrders";
import { trackingService } from "../../tracking/services/tracking.service";
import { useTrackingStore } from "../../tracking/store/useTrackingStore";
import { ORDER_STATUS } from "../constants/order-status";
import { FooterActionContainer } from "../../../shared/components/ui/FooterActionContainer";
import { AppModal } from "../../../shared/components/ui/AppModal";
import { colors } from "../../../shared/theme/theme";
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
    isUploadingGroupEvidence,
  } = useOrders();

  const [photo, setPhoto] = useState<string | null>(null);
  const [observationNote, setObservationNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isObserving, setIsObserving] = useState<boolean>(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });
  const lastKnownLocation = useTrackingStore((state) => state.lastKnownLocation);

  const orderFromHook = orders.find((o) => o.id === orderId);
  const rawOrder = route.params?.order || orderFromHook;
  const groupedOrders =
    route.params?.order?.groupedOrders ||
    (rawOrder?.stopGroupId ? orders.filter((o) => o.stopGroupId === rawOrder.stopGroupId) : undefined);
  const order = rawOrder ? { ...rawOrder, groupedOrders } : null;

  const isGroupedStop = !!(order?.groupedOrders && order.groupedOrders.length > 1);
  const pendingInGroup = isGroupedStop
    ? order!.groupedOrders!.filter(
        (o: any) => o.status === ORDER_STATUS.PENDING || o.status === ORDER_STATUS.IN_TRANSIT
      )
    : [];

  const isSubmitting =
    isConfirming || isObserving || isUpdatingStatus || isUploadingEvidence || isUploadingGroupEvidence;

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
    warehouseContact,
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
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3500)),
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
      {/* Header Limpio y Moderno */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBackButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Detalle del despacho
        </Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Parada Conjunta si hay múltiples entregas */}
        {isGroupedStop && order.groupedOrders && (
          <View style={styles.groupedCard}>
            <View style={styles.groupedHeader}>
              <Ionicons name="git-merge-outline" size={16} color="#3D5FFF" />
              <Text style={styles.groupedTitle}>
                Parada conjunta · {order.groupedOrders.length} pedidos
              </Text>
            </View>
            <Text style={styles.groupedSubtitle}>
              Confirma la entrega de ambos con una sola foto.
            </Text>

            <View style={styles.groupedOrdersList}>
              {order.groupedOrders.map((sub: any, idx: number) => {
                const isDelivered = sub.status === ORDER_STATUS.DELIVERED;
                return (
                  <View key={sub.id || idx} style={styles.groupedOrderItem}>
                    <View style={styles.groupedOrderLeft}>
                      <Text style={styles.groupedOrderCode}>#{sub.code}</Text>
                      <Text style={styles.groupedOrderClient} numberOfLines={1}>
                        {sub.client || sub.recipientName || "Cliente"}
                      </Text>
                    </View>
                    <View>
                      {isDelivered ? (
                        <View style={styles.badgeDelivered}>
                          <Text style={styles.badgeDeliveredText}>✓ Entregado</Text>
                        </View>
                      ) : (
                        <View style={styles.badgePending}>
                          <Text style={styles.badgePendingText}>Pendiente</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Lista de Información Principal Integrada (Sin tarjetas pesadas) */}
        <View style={styles.infoList}>
          {/* Dirección de Entrega */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Dirección</Text>
              <Text style={styles.infoValue}>
                {address || "Dirección no especificada"}
              </Text>
            </View>
          </View>
          <View style={styles.infoDivider} />

          {/* Guía de Remisión */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="document-text-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Guía de remisión</Text>
              <Text style={styles.infoValue}>{waybill || "—"}</Text>
            </View>
          </View>
          <View style={styles.infoDivider} />

          {/* Contacto Cliente */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={18} color="#64748B" />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Contacto cliente</Text>
              <Text style={styles.infoValue}>{recipientPhone || "—"}</Text>
            </View>
          </View>

          {/* Contacto Almacén (Si está presente) */}
          {warehouseContact ? (
            <>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <View style={styles.infoIconBox}>
                  <Ionicons name="business-outline" size={18} color="#64748B" />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Contacto almacén</Text>
                  <Text style={styles.infoValue}>{warehouseContact}</Text>
                </View>
              </View>
            </>
          ) : null}

          {/* Banner Informativo si el pedido está Pendiente */}
          {isPending ? (
            <View style={styles.infoBanner}>
              <Text style={styles.infoBannerText}>
                ℹ️ Para tomar evidencias y finalizar la entrega de este pedido, debes iniciar el recorrido desde tu Hoja de Ruta.
              </Text>
            </View>
          ) : null}
        </View>

        {/* Evidencia Fotográfica */}
        {isInTransit || currentPhoto ? (
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.sectionTitle}>Evidencia fotográfica de entrega</Text>
            <Text style={styles.sectionSubtitle}>
              Foto de la guía firmada o del paquete entregado.
            </Text>

            {currentPhoto ? (
              <View style={styles.photoPreviewBox}>
                <Image source={{ uri: currentPhoto }} style={styles.photoImage} />
                {isInTransit ? (
                  <TouchableOpacity
                    style={styles.retakePhotoButton}
                    onPress={handleTakePhoto}
                    activeOpacity={0.8}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.retakePhotoText}>📸 Volver a tomar foto</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <TouchableOpacity
                style={styles.takePhotoButton}
                onPress={handleTakePhoto}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                <Ionicons name="camera-outline" size={26} color={colors.primary} style={{ marginBottom: 6 }} />
                <Text style={styles.takePhotoButtonText}>Tomar foto de la guía firmada</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {/* Nota / Comentario Guardado (Visible si ya fue completado u observado) */}
        {(() => {
          const noteToDisplay = reasonText || signatureText;
          if (!noteToDisplay) return null;

          const isDelivered = status === ORDER_STATUS.DELIVERED;
          const isObserved = status === ORDER_STATUS.OBSERVED;

          const iconColor = isDelivered ? "#059669" : isObserved ? "#DC2626" : "#475569";
          const iconName = isDelivered
            ? "checkmark-circle-outline"
            : isObserved
            ? "alert-circle-outline"
            : "chatbubble-ellipses-outline";
          const title = isDelivered
            ? "Nota / Comentario de Entrega"
            : isObserved
            ? "Motivo de Observación / Incidencia"
            : "Comentario Registrado";

          return (
            <View
              style={{
                backgroundColor: isDelivered ? "#F0FDF4" : isObserved ? "#FEF2F2" : "#F8FAFC",
                borderColor: isDelivered ? "#BBF7D0" : isObserved ? "#FECACA" : "#E2E8F0",
                borderWidth: 1,
                borderRadius: 12,
                padding: 14,
                marginBottom: 16,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Ionicons name={iconName as any} size={16} color={iconColor} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: iconColor }}>
                  {title}
                </Text>
              </View>
              <Text
                style={{
                  fontSize: 13,
                  color: isDelivered ? "#166534" : isObserved ? "#991B1B" : "#1E293B",
                  lineHeight: 18,
                  marginTop: 4,
                }}
              >
                {noteToDisplay}
              </Text>
            </View>
          );
        })()}

        {/* Comentario (opcional) mientras está EN CAMINO */}
        {isInTransit ? (
          <View style={styles.commentSection}>
            <Text style={styles.commentLabel}>Comentario (opcional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Ej: entregado en recepción, recibido por Carlos"
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

      {/* Footer de Acciones (Botón Principal Azul + Texto Reportar Incidencia) */}
      {isInTransit && (
        <FooterActionContainer>
          <View style={styles.footerContainer}>
            <TouchableOpacity
              style={[styles.footerPrimaryButton, isSubmitting && { opacity: 0.7 }]}
              onPress={handleConfirmDelivery}
              disabled={isSubmitting}
              activeOpacity={0.85}
            >
              {isConfirming ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.footerPrimaryButtonText}>
                  {isGroupedStop && pendingInGroup.length > 1
                    ? `✓ Entregar ambos (${pendingInGroup.length})`
                    : "✓ Confirmar entrega"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.footerSecondaryButton}
              onPress={handleReportObservation}
              disabled={isSubmitting}
              activeOpacity={0.7}
            >
              {isObserving ? (
                <ActivityIndicator color="#EF4444" size="small" />
              ) : (
                <Text style={styles.footerSecondaryButtonText}>Reportar incidencia</Text>
              )}
            </TouchableOpacity>
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
