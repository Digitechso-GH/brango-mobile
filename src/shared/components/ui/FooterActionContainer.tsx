import React from "react";
import { StyleSheet, View, Platform, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface FooterActionContainerProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export const FooterActionContainer: React.FC<FooterActionContainerProps> = ({ children, style }) => {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom + 8, Platform.OS === "ios" ? 34 : 20);

  return (
    <View style={[styles.container, { paddingBottom: bottomPadding }, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
});
