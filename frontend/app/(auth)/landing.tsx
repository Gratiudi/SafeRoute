import React from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";

const features = [
  "Safe route navigation with real-time safety scores",
  "Real-time location sharing with trusted contacts",
  "Emergency SOS with automatic evidence recording",
  "Delayed alert system for uncertain situations",
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <View style={styles.page}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.hero}>
          <View style={styles.logoWrap}>
            <Image
              source={require("../../assets/images/logo.png")}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.heroText}>
            <Text style={styles.appName}>SafeRoute</Text>
            <Text style={styles.subtitle}>
              Your safety companion for every journey
            </Text>
          </View>
        </View>

        <View style={styles.featureCard}>
          <Text style={styles.cardTitle}>Stay Protected With</Text>
          <View style={styles.featureList}>
            {features.map((feature) => (
              <View key={feature} style={styles.featureItem}>
                <View style={styles.checkIcon}>
                  <MaterialIcons name="check" size={14} color="#16A34A" />
                </View>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.button, styles.primaryButton]}
            onPress={() => router.push("/(auth)/register")}
          >
            <Text style={styles.primaryText}>Create Account</Text>
          </Pressable>

          <Pressable
            style={[styles.button, styles.secondaryButton]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.secondaryText}>Login</Text>
          </Pressable>
        </View>

        <Text style={styles.footer}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  glowTop: {
    position: "absolute",
    top: -120,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: "#EDE9FE",
    opacity: 0.7,
  },
  glowBottom: {
    position: "absolute",
    bottom: -140,
    left: -100,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#FCE7F3",
    opacity: 0.7,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 20,
    gap: 10,
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  hero: {
    alignItems: "center",
    gap: 1,
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoImage: {
    width: 150,
    height: 150,
    marginBottom: -20,
  },
  heroText: {
    alignItems: "center",
    gap: 2,
  },
  appName: {
    fontSize: 30,
    fontWeight: "700",
    color: "#7C3AED",
  },
  subtitle: {
    textAlign: "center",
    color: "#64748B",
    lineHeight: 22,
  },
  featureCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTitle: {
    textAlign: "center",
    fontWeight: "600",
    color: "#0F172A",
  },
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  featureText: {
    color: "#475569",
    flex: 1,
    lineHeight: 20,
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
    borderWidth: 1,
  },
  primaryButton: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  primaryText: {
    color: "#ffffff",
    fontWeight: "600",
  },
  secondaryButton: {
    borderColor: "#DDD6FE",
    backgroundColor: "#FFFFFF",
  },
  secondaryText: {
    color: "#6D28D9",
    fontWeight: "600",
  },
  footer: {
    textAlign: "center",
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 16,
  },
});
