import React, { useState } from "react";
import { StyleSheet, View, Text, TouchableOpacity, ActivityIndicator, Alert, Image } from "react-native";
import { useOrders } from "../hooks/useOrders";

import { trackingService } from "../services/TrackingService";

export const CameraScreen = ({ route, navigation }: any) => {
  const { orderId } = route.params;
  const { uploadEvidence, updateStatus, isUploadingEvidence } = useOrders();
  const [photo, setPhoto] = useState<string | null>(null);

  const handleCapture = () => {
    // Simulación de captura con la cámara de Expo
    setPhoto("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80");
  };

  const handleSaveEvidence = async () => {
    if (!photo) return;
    
    try {
      // 1. Simulación de compresión local:
      // Aquí iría: await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 800 } }], { compress: 0.6 })
      console.log("Comprimiendo imagen localmente para optimizar peso (S3 y Datos)...");
      
      // 2. Subida de evidencia
      await uploadEvidence({ 
        orderId, 
        base64Image: "compressed-base64-image-string" 
      });

      // 3. Cambiar estado a Entregado
      await updateStatus({ orderId, status: "DELIVERED" });

      // 4. Detener rastreo y apagar foreground service
      await trackingService.stopTracking();

      Alert.alert("Entregado", "La evidencia fue subida con éxito y el pedido se marcó como Entregado.");
      navigation.navigate("Roadmap");
    } catch (e) {
      Alert.alert("Error", "Ocurrió un error al procesar la evidencia.");
    }
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <View style={styles.cameraContainer}>
          <Text style={styles.cameraPlaceholderText}>[ Vista Previa de la Cámara ]</Text>
          <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
            <View style={styles.innerCaptureButton} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          
          <View style={styles.buttonsContainer}>
            <TouchableOpacity 
              style={styles.retakeButton} 
              onPress={() => setPhoto(null)}
              disabled={isUploadingEvidence}
            >
              <Text style={styles.retakeText}>Reintentar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.confirmButton} 
              onPress={handleSaveEvidence}
              disabled={isUploadingEvidence}
            >
              {isUploadingEvidence ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>Usar Foto y Completar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },
  cameraContainer: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  cameraPlaceholderText: {
    color: "#94A3B8",
    fontSize: 16,
    marginTop: 100,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  innerCaptureButton: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: "#FFFFFF",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  previewImage: {
    flex: 1,
    resizeMode: "cover",
  },
  buttonsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 16,
    backgroundColor: "#0F172A",
  },
  retakeButton: {
    flex: 1,
    backgroundColor: "#1E293B",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  retakeText: {
    color: "#94A3B8",
    fontSize: 15,
    fontWeight: "700",
  },
  confirmButton: {
    flex: 2,
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
