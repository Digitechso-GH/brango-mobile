import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuthStore } from "../features/auth/store/useAuthStore";
import { LoginScreen } from "../features/auth/screens/LoginScreen";
import { RoadmapScreen } from "../features/orders/screens/RoadmapScreen";
import { OrderDetailScreen } from "../features/orders/screens/OrderDetailScreen";
import { CameraScreen } from "../features/orders/screens/CameraScreen";
import { SuccessScreen } from "../features/orders/screens/SuccessScreen";

import { Order } from "../features/orders/types/orders.types";

export type RootStackParamList = {
  Login: undefined;
  Roadmap: undefined;
  OrderDetail: { orderId: string; photo?: string; order?: Order };
  Camera: { orderId: string; order?: Order };
  Success: { orderId: string; client: string; guia?: string; isObserved?: boolean; note?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export const AppNavigator = () => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Roadmap" component={RoadmapScreen} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} />
          <Stack.Screen
            name="Camera"
            component={CameraScreen}
            options={{ presentation: "fullScreenModal" }}
          />
          <Stack.Screen name="Success" component={SuccessScreen} />
        </>
      )}
    </Stack.Navigator>
  );
};
