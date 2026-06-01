import { View, Text, StyleSheet } from "react-native";

// Stub components that render nothing (or a placeholder) on web
export function MapView({ children, style }: any) {
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.text}>Map not available on web</Text>
    </View>
  );
}

export function Marker(_props: any) {
  return null;
}

export function Polyline(_props: any) {
  return null;
}

const styles = StyleSheet.create({
  placeholder: {
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
  },
  text: {
    color: "#64748B",
    fontSize: 13,
  },
});
