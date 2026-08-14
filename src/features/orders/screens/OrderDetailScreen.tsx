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
  const { orders, updateStatus, uploadEvidence, isUpdatingStatus, isUploadingEvidence } = useOrders();
  const [photo, setPhoto] = useState<string | null>(null);
  const [observationNote, setObservationNote] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState<boolean>(false);
  const [isObserving, setIsObserving] = useState<boolean>(false);
  const [showGpsModal, setShowGpsModal] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, message: "" });
  const lastKnownLocation = useTrackingStore((state) => state.lastKnownLocation);

  const order = orders.find((o) => o.id === orderId);

  const isSubmitting = isConfirming || isObserving || isUpdatingStatus || isUploadingEvidence;

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
    status,
  } = order;

  const isPending = status === ORDER_STATUS.PENDING;
  const isInTransit = status === ORDER_STATUS.IN_TRANSIT;

  const handleTakePhoto = () => {
    navigation.navigate("Camera", { orderId: currentOrderId });
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
      const currentLoc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
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
        setShowGpsModal(true);
        setIsConfirming(false);
        return;
      }

      const { latitude, longitude } = await getDestinationCoordinates();

      if (photo) {
        await uploadEvidence({
          orderId: currentOrderId,
          base64Image: photo,
          signatureText: `Entregado a: ${recipientName || "Destinatario"}`,
        });
      }

      trackingService.stopTracking();
      await updateStatus({
        orderId: currentOrderId,
        status: ORDER_STATUS.DELIVERED,
        latitude,
        longitude,
      });

      navigation.replace("Success", {
        orderId: currentOrderId,
        client,
        guia: waybill,
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
        setShowGpsModal(true);
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

          {/* Observación Registrada (reasonText) */}
          {reasonText ? (
            <>
              <View style={styles.tableRowDivider} />
              <View style={styles.tableRow}>
                <View style={styles.tableRowLeft}>
                  <View style={[styles.iconBadge, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="alert-circle-outline" size={16} color="#EF4444" />
                  </View>
                  <Text style={styles.tableLabel}>Observación</Text>
                </View>
                <Text style={[styles.tableValue, { color: "#EF4444" }]}>{reasonText}</Text>
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

        {/* Card 3: Observaciones / Incidencias (Solo cuando está EN CAMINO) */}
        {isInTransit ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reportar Observación / Incidencia</Text>
            <Text style={styles.cardSubtitle}>
              Ingresa cualquier nota importante si el cliente no se encuentra o hay alguna restricción.
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Ej: Cliente ausente, recepción cerrada, reprogramado..."
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
              title="Confirmar Entrega"
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
