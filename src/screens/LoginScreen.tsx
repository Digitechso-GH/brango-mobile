import React, { useState } from "react";
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { useStore } from "../store/useStore";

export const LoginScreen = () => {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const login = useStore((state) => state.login);

  const handleLogin = async () => {
    if (!phone || !password) {
      Alert.alert("Error", "Por favor completa todos los campos.");
      return;
    }
    
    setLoading(true);
    // Simulación de Login seguro
    setTimeout(() => {
      setLoading(false);
      login(
        {
          id: "USR-001",
          name: "Carlos Mendoza",
          email: "carlos@brango.com",
          plate: "ABC-123",
        },
        "mock-jwt-token-xyz"
      );
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.brandTitle}>Bran Go</Text>
        <Text style={styles.subtitle}>Portal de Conductores</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Celular</Text>
          <TextInput
            style={styles.input}
            placeholder="999 999 999"
            placeholderTextColor="#94A3B8"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#94A3B8"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
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
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
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
});
