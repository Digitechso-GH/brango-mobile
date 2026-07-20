import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useStore } from "../store/useStore";
import axios from "axios";
import { API_URL } from "../config/env";

export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useStore((state) => state.login);

  const handleLogin = async () => {
    setEmailError("");
    setPasswordError("");

    if (!email || !password) {
      if (!email) setEmailError("El correo electrónico es obligatorio");
      if (!password) setPasswordError("La contraseña es obligatoria");
      return;
    }
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim(),
        password,
      });

      const data = res.data.data;
      if (data && data.token && data.user) {
        if (data.user.rol !== "SYS_DRIVER") {
          Alert.alert("Acceso denegado", "Este portal es exclusivo para conductores.");
          setLoading(false);
          return;
        }

        login(
          {
            id: data.user.id,
            name: data.user.nombre,
            email: data.user.email,
            plate: data.user.unidad || "Sin placa",
            driverId: data.user.driverId,
          },
          data.token
        );
      } else {
        throw new Error("Respuesta de autenticación incompleta");
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.message;
      let displayMsg = "Correo o contraseña incorrectos.";

      if (Array.isArray(rawMsg)) {
        displayMsg = rawMsg.join("\n");
        rawMsg.forEach((m: string) => {
          if (m.toLowerCase().includes("correo") || m.toLowerCase().includes("email")) {
            setEmailError(m);
          }
          if (m.toLowerCase().includes("contraseña") || m.toLowerCase().includes("password")) {
            setPasswordError(m);
          }
        });
      } else if (typeof rawMsg === "string") {
        displayMsg = rawMsg;
        if (rawMsg.toLowerCase().includes("correo") || rawMsg.toLowerCase().includes("email")) {
          setEmailError(rawMsg);
        }
        if (rawMsg.toLowerCase().includes("contraseña") || rawMsg.toLowerCase().includes("password")) {
          setPasswordError(rawMsg);
        }
      }

      Alert.alert("Error de ingreso", displayMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>Bran Go</Text>
        <Text style={styles.subtitle}>Portal de Conductores</Text>
 
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Correo Electrónico</Text>
          <TextInput
            style={[styles.input, emailError ? styles.inputError : null]}
            placeholder="conductor@brango.com"
            placeholderTextColor="#94A3B8"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (emailError) setEmailError("");
            }}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
        </View>
 
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={[styles.input, passwordError ? styles.inputError : null]}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError("");
            }}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
        </View>
 
        <TouchableOpacity 
          style={styles.button} 
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Iniciar Sesión</Text>
          )}
        </TouchableOpacity>
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
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.05)",
    elevation: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#3D5FFF", // Azul institucional
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: "#0F172A",
  },
  button: {
    backgroundColor: "#3D5FFF",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#EF4444",
    backgroundColor: "#FEF2F2",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    marginLeft: 4,
  },
});
