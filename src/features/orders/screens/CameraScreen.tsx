import React, { useState, useRef, useEffect } from "react";
import { StyleSheet, View, Text, TouchableOpacity, Image, Platform, ActivityIndicator, BackHandler } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";

export const CameraScreen = ({ route, navigation }: any) => {
  const { orderId, order } = route.params;
  const [photo, setPhoto] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    const onBackPress = () => {
      // Bloquear botón atrás físico en la cámara
      return true;
    };
    const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => {
      subscription.remove();
    };
  }, []);

  const handleCapture = async () => {
    if (Platform.OS === "web") {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (evt) => {
            if (evt.target?.result) setPhoto(evt.target.result as string);
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    } else {
      if (cameraRef.current) {
        try {
          const options = { quality: 0.8 };
          const data = await cameraRef.current.takePictureAsync(options);
          if (data && data.uri) {
            setPhoto(data.uri);
          } else if (data && data.base64) {
            setPhoto(`data:image/jpeg;base64,${data.base64}`);
          }
        } catch (err) {
          console.error("Error al tomar foto con CameraView:", err);
        }
      }
    }
  };

  const handleRetake = () => {
    setPhoto(null);
  };

  const handleSaveEvidence = () => {
    if (!photo) return;
    navigation.navigate("OrderDetail", { orderId, photo, order });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (Platform.OS !== "web" && !permission) {
    return <View style={styles.container} />;
  }

  if (Platform.OS !== "web" && !permission?.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionIcon}>📷</Text>
        <Text style={styles.permissionTitle}>Permiso de Cámara Requerido</Text>
        <Text style={styles.permissionText}>
          Necesitamos acceso a la cámara de tu teléfono para registrar la foto de la guía de remisión.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission} activeOpacity={0.8}>
          <Text style={styles.permissionButtonText}>Conceder Permiso</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelPermissionButton} onPress={handleClose} activeOpacity={0.8}>
          <Text style={styles.cancelPermissionText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.8}>
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {!photo ? (
        <View style={styles.cameraContainer}>
          {Platform.OS === "web" ? (
            <View style={styles.centerPlaceholder}>
              <Text style={styles.cameraPlaceholderText}>📷 Toca el botón obturador para seleccionar o capturar la foto de la guía</Text>
            </View>
          ) : (
            <CameraView
              ref={cameraRef}
              style={styles.cameraView}
              facing="back"
            />
          )}

          <View style={styles.shutterContainer}>
            <TouchableOpacity style={styles.captureButton} onPress={handleCapture} activeOpacity={0.85}>
              <View style={styles.innerCaptureButton} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.previewContainer}>
          <Image source={{ uri: photo }} style={styles.previewImage} />

          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={styles.retakeButton} onPress={handleRetake} activeOpacity={0.8}>
              <Text style={styles.retakeText}>📸 Volver a tomar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.confirmButton} onPress={handleSaveEvidence} activeOpacity={0.8}>
              <Text style={styles.confirmText}>💾 Guardar Foto</Text>
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
    position: "relative",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  permissionIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
  },
  permissionText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  permissionButton: {
    backgroundColor: "#3D5FFF",
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 14,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  cancelPermissionButton: {
    paddingVertical: 10,
  },
  cancelPermissionText: {
    color: "#64748B",
    fontSize: 14,
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    zIndex: 50,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "bold",
  },
  cameraContainer: {
    flex: 1,
    position: "relative",
  },
  cameraView: {
    width: "100%",
    height: "100%",
  },
  centerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  cameraPlaceholderText: {
    color: "#94A3B8",
    fontSize: 15,
    textAlign: "center",
  },
  shutterContainer: {
    position: "absolute",
    bottom: 30,
    width: "100%",
    alignItems: "center",
    zIndex: 40,
  },
  captureButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  innerCaptureButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "#FFFFFF",
  },
  previewContainer: {
    flex: 1,
    justifyContent: "space-between",
  },
  previewImage: {
    flex: 1,
    resizeMode: "contain",
    backgroundColor: "#000000",
  },
  buttonsContainer: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    backgroundColor: "#0F172A",
    borderTopWidth: 1,
    borderTopColor: "#1E293B",
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
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmButton: {
    flex: 1.5,
    backgroundColor: "#10B981",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
});
