<div align="center">
  <h1>📱 Bran Go - Mobile App (Choferes)</h1>
  <p><strong>Aplicación Móvil para Seguimiento de Entregas y Telemetría GPS en Background</strong></p>
</div>

## 📌 Descripción

La aplicación móvil de **Bran Go** está diseñada exclusivamente para los conductores de la flota. Permite visualizar los pedidos asignados, gestionar estados de entrega (En Camino, Entregado, Observado), subir evidencias fotográficas (ePOD) y, lo más importante, emite pings GPS constantes a través de WebSockets hacia la torre de control administrativa.

## 🛠 Stack Tecnológico

- **Framework**: [Expo](https://expo.dev/) (React Native)
- **Lenguaje**: TypeScript
- **Navegación**: Expo Router (File-based routing)
- **Localización y GPS**: Expo Location / Background Location
- **Cámara y Fotos**: Expo Image Picker / Expo Camera
- **Tiempo Real**: Socket.io Client
- **Estilos**: NativeWind (Tailwind CSS para React Native) / StyleSheet

## 🚀 Requisitos Previos

- Node.js (v20 o superior)
- Expo CLI (`npm install -g expo-cli`)
- Aplicación **Expo Go** instalada en tu dispositivo físico (iOS/Android) o contar con Android Studio / Xcode para emuladores.

## ⚙️ Variables de Entorno

Crea un archivo `.env` en la raíz:

```env
# URL de la API del Backend (Asegúrate de usar la IP local de tu PC si usas un dispositivo físico en la misma red WiFi, NUNCA localhost)
EXPO_PUBLIC_API_URL=http://192.168.1.X:3001
```

## 💻 Instalación y Uso Local

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Iniciar el servidor de Metro / Expo:
   ```bash
   npx expo start -c
   ```
3. Escanear el código QR con tu celular usando Expo Go.

## 📡 Funciones Clave (Telemetría)

El módulo de `TrackingService` se encarga de:
- Capturar la geolocalización de alta precisión del dispositivo.
- Emitir pings por `Socket.io` al servidor (`driver:location`).
- Controlar el *Throttling* para no saturar la red.
- Funcionar como Singleton para asegurar que una sola instancia transmita los datos mientras la ruta esté en progreso.

## 📦 Construcción (Build para Stores)

Para construir los archivos nativos `.apk`, `.aab` o `.ipa`, se recomienda usar **EAS (Expo Application Services)**:

```bash
# Configurar proyecto en EAS
eas init

# Construir APK de Android localmente o en la nube
eas build -p android --profile preview
```
