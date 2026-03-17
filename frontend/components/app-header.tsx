import React, { useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SafeAreaView } from "react-native-safe-area-context";

type NavItem = {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  path: string;
};

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Home", icon: "security", path: "/(tabs)" },
  { id: "routes", label: "Routes", icon: "map", path: "/(tabs)/explore" },
  { id: "share", label: "Share", icon: "share", path: "/(tabs)/share" },
  {
    id: "contacts",
    label: "Contacts",
    icon: "people",
    path: "/(tabs)/contacts",
  },
  { id: "profile", label: "Profile", icon: "person", path: "/(tabs)/profile" },
];

type AppHeaderProps = {
  title: string;
};

export function AppHeader({ title }: AppHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);

  const activePath = useMemo(() => {
    if (pathname === "/(tabs)" || pathname === "/(tabs)/index")
      return "/(tabs)";
    return pathname;
  }, [pathname]);

  return (
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.left}>
          <Pressable
            onPress={() => setSheetOpen(true)}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.iconButtonPressed,
            ]}
          >
            <MaterialIcons name="menu" size={20} color="#0F172A" />
          </Pressable>

          <View style={styles.brand}>
            <View style={styles.brandIcon}>
              <Image
                source={require("../assets/images/logo.png")}
                style={styles.brandLogo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>{title}</Text>
          </View>
        </View>

        <Pressable
          onPress={() => setEmergencyOpen(true)}
          style={({ pressed }) => [
            styles.emergencyButton,
            pressed && styles.emergencyButtonPressed,
          ]}
        >
          <MaterialIcons name="security" size={20} color="#DC2626" />
        </Pressable>
      </View>

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <View style={styles.sheetBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSheetOpen(false)}
          />
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetBrandIcon}>
                <Image
                  source={require("../assets/images/logo.png")}
                  style={styles.sheetBrandLogo}
                  resizeMode="contain"
                />
              </View>
              <View>
                <Text style={styles.sheetTitle}>SafeRoute</Text>
                <Text style={styles.sheetSubtitle}>Stay Protected</Text>
              </View>
            </View>

            <View style={styles.sheetNav}>
              {NAV_ITEMS.map((item) => {
                const isActive = activePath === item.path;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => {
                      setSheetOpen(false);
                      router.push(item.path as any);
                    }}
                    style={({ pressed }) => [
                      styles.sheetItem,
                      isActive && styles.sheetItemActive,
                      pressed && styles.sheetItemPressed,
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={isActive ? "#FFFFFF" : "#0F172A"}
                    />
                    <Text
                      style={[
                        styles.sheetItemText,
                        isActive && styles.sheetItemTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={emergencyOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEmergencyOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setEmergencyOpen(false)}
          />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency SOS</Text>
            <Text style={styles.modalBody}>
              This will alert your emergency contacts and begin recording
              evidence.
            </Text>
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setEmergencyOpen(false)}
                style={styles.modalButtonGhost}
              >
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => setEmergencyOpen(false)}
                style={styles.modalButtonDanger}
              >
                <Text style={styles.modalButtonDangerText}>Start SOS</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: { opacity: 0.7 },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  brandLogo: {
    width: 30,
    height: 30,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F172A",
  },
  emergencyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FEF2F2",
  },
  emergencyButtonPressed: { opacity: 0.7 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    flexDirection: "row",
  },
  sheet: {
    width: 280,
    backgroundColor: "#FFFFFF",
    paddingVertical: 24,
    paddingHorizontal: 16,
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  sheetBrandIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBrandLogo: {
    width: 34,
    height: 34,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  sheetNav: {
    gap: 8,
  },
  sheetItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sheetItemPressed: { opacity: 0.8 },
  sheetItemActive: {
    backgroundColor: "#7C3AED",
  },
  sheetItemText: {
    fontSize: 15,
    color: "#0F172A",
    fontWeight: "500",
  },
  sheetItemTextActive: {
    color: "#FFFFFF",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalBody: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButtonGhost: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalButtonGhostText: {
    color: "#0F172A",
    fontWeight: "600",
  },
  modalButtonDanger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "#DC2626",
  },
  modalButtonDangerText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
