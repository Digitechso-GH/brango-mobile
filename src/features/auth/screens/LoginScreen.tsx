import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "../store/useAuthStore";
import { loginApi } from "../api/auth.api";
import { fetchAssignedOrders } from "../../orders/api/orders.api";
import { PrimaryButton } from "../../../shared/components/ui/PrimaryButton";

export const LoginScreen = () => {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    if (!email || !password) {
      if (!email) setEmailError("El usuario es obligatorio");
      if (!password) setPasswordError("La contraseña es obligatoria");
      return;
    }
    
    setLoading(true);
    try {
      const data = await loginApi({ email, password });

      if (data && data.token && data.user) {
        if (data.user.rol !== "SYS_DRIVER") {
          Alert.alert("Acceso denegado", "Este portal es exclusivo para conductores.");
          setLoading(false);
          return;
        }

        const driverId = data.user.driverId;
        const token = data.token;
        const refreshToken = data.refreshToken;

        try {
          await queryClient.prefetchQuery({
            queryKey: ["orders", token, driverId],
            queryFn: () => fetchAssignedOrders(driverId || undefined),
            staleTime: 1000 * 60 * 5,
          });
        } catch (e) {
          // Si falla la precarga, el hook useOrders hara el intento en RoadmapScreen
        }

        await login(
          {
            id: data.user.id,
            name: data.user.name,
            email: data.user.email,
            plate: data.user.unit || "Sin placa",
            driverId: data.user.driverId,
          },
          data.token,
          data.refreshToken
        );
      } else {
        throw new Error("Respuesta de autenticación incompleta");
      }
    } catch (err: any) {
      console.error("Detalle del error al iniciar sesión:", err);
      const rawMsg = err.response?.data?.message;
      const messages = Array.isArray(rawMsg) ? rawMsg : rawMsg ? [rawMsg] : [];

      const matchKey = (msg: string, keys: string[]) => keys.some((k) => msg.toLowerCase().includes(k));

      messages.forEach((msg: string) => {
        if (matchKey(msg, ["email", "usuario", "correo"])) setEmailError(msg);
        if (matchKey(msg, ["password", "contraseña"])) setPasswordError(msg);
      });

      const displayMsg =
        messages.join("\n") ||
        (err.message === "Network Error"
          ? "No se pudo conectar con el servidor backend. Verifica tu conexión a internet."
          : err.message || "Usuario o contraseña incorrectos.");

      Alert.alert("Error de ingreso", displayMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formStack}>
        {/* Logo Icon Pin (BranGo) */}
        <View style={styles.logoContainer}>
          <View style={styles.pinShape}>
            <View style={styles.pinInnerDot} />
          </View>
          <Text style={styles.brandTitle}>BranGo</Text>
        </View>

        {/* Input Usuario */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Usuario</Text>
          <TextInput
            style={[styles.input, !!emailError && styles.inputError]}
            placeholder="Ingresa tu usuario"
            placeholderTextColor="#94A3B8"
            cursorColor="#3D5FFF"
            selectionColor="rgba(61, 95, 255, 0.25)"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>

        {/* Input Contraseña */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={[styles.input, !!passwordError && styles.inputError]}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            cursorColor="#3D5FFF"
            selectionColor="rgba(61, 95, 255, 0.25)"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>

        {/* Botón Ingresar */}
        <PrimaryButton
          title="Ingresar"
          onPress={handleLogin}
          isLoading={loading}
          style={styles.submitButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  formStack: {
    width: "100%",
    maxWidth: 360,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 36,
  },
  pinShape: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderBottomLeftRadius: 0,
    transform: [{ rotate: "-45deg" }],
    backgroundColor: "#3D5FFF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#3D5FFF",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  pinInnerDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 14,
    fontSize: 15,
    color: "#0F172A",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  inputError: {
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
    marginLeft: 4,
  },
  submitButton: {
    marginTop: 8,
    borderRadius: 16,
    paddingVertical: 16,
  },
});
