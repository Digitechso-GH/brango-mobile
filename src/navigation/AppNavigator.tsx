import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useStore } from "../store/useStore";
import { LoginScreen } from "../screens/LoginScreen";
import { RoadmapScreen } from "../screens/RoadmapScreen";
import { OrderDetailScreen } from "../screens/OrderDetailScreen";
import { CameraScreen } from "../screens/CameraScreen";

export type RootStackParamList = {
  Login: undefined;
  Roadmap: undefined;
  OrderDetail: { orderId: string };
  Camera: { orderId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const user = useStore((state) => state.user);

  return (
    <Stack.Navigator screenOptions={{ headerShown: true }}>
      {!user ? (
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
      ) : (
        <>
          <Stack.Screen 
            name="Roadmap" 
            component={RoadmapScreen} 
            options={{ title: "Mi Hoja de Ruta" }} 
          />
          <Stack.Screen 
            name="OrderDetail" 
            component={OrderDetailScreen} 
            options={{ title: "Detalle del Pedido" }} 
          />
          <Stack.Screen 
            name="Camera" 
            component={CameraScreen} 
            options={{ title: "Capturar Evidencia" }} 
          />
        </>
      )}
    </Stack.Navigator>
  );
};
