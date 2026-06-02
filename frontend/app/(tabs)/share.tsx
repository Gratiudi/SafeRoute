import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as Location from "expo-location";
import { useAuth } from "@/lib/auth";
import { authedApiFetch } from "@/lib/api";

type EmergencyContact = {
  contact_id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
};

type LocationCoords = {
  latitude: number;
  longitude: number;
  address?: string;
  updatedAt?: Date;
};

export default function ShareScreen() {
  const { token } = useAuth();

  // ── Contacts ─────────────────────────────────────────────────────────────
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);

  // ── Location ──────────────────────────────────────────────────────────────
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // ── Live sharing session ──────────────────────────────────────────────────
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  const updateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch contacts ────────────────────────────────────────────────────────
  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setContactsLoading(true);
    try {
      const data = await authedApiFetch("/api/emergency-contacts", token);
      setContacts(Array.isArray(data) ? data : []);
    } catch {
      setContacts([]);
    } finally {
      setContactsLoading(false);
    }
  }, [token]);

  // ── Fetch / refresh current GPS location ─────────────────────────────────
  const refreshLocation = useCallback(async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocation(null);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      // Reverse-geocode for a readable address
      let address: string | undefined;
      try {
        const [geo] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geo) {
          address = [geo.street, geo.district ?? geo.subregion, geo.city]
            .filter(Boolean)
            .join(", ");
        }
      } catch {
        // ignore geocoding failures
      }

      setLocation({ latitude, longitude, address, updatedAt: new Date() });
    } catch {
      setLocation(null);
    } finally {
      setLocationLoading(false);
    }
  }, []);

  // ── Push a location update to the active share session ────────────────────
  const pushLocationUpdate = useCallback(async (code: string) => {
    if (!token) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await authedApiFetch("/api/location/share/update", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          share_code: code,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      });
      setLocation((prev) => ({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        address: prev?.address,
        updatedAt: new Date(),
      }));
    } catch {
      // silent — network blips are expected
    }
  }, [token]);

  // ── Toggle live sharing on / off ──────────────────────────────────────────
  const handleToggleSharing = async (value: boolean) => {
    if (!token) return;
    setShareError(null);
    setShareLoading(true);
    try {
      if (value) {
        // Start a new share session
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setShareError("Location permission is required to share your location.");
          return;
        }
        const pos = await Location.getCurrentPositionAsync({});
        const data = await authedApiFetch("/api/location/share/start", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
        });
        const code: string = data?.share_code;
        setShareCode(code);
        setIsLiveSharing(true);

        // Send position every 10 s while sharing
        updateIntervalRef.current = setInterval(() => {
          void pushLocationUpdate(code);
        }, 10_000);
      } else {
        // Stop the active session
        if (shareCode) {
          await authedApiFetch("/api/location/share/stop", token, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ share_code: shareCode }),
          });
        }
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
          updateIntervalRef.current = null;
        }
        setShareCode(null);
        setIsLiveSharing(false);
      }
    } catch (e: any) {
      setShareError(e?.message ?? "Failed to toggle sharing.");
    } finally {
      setShareLoading(false);
    }
  };

  // ── Initial data load ─────────────────────────────────────────────────────
  useEffect(() => {
    void fetchContacts();
    void refreshLocation();
    return () => {
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [fetchContacts, refreshLocation]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const formatUpdatedAt = (d?: Date) => {
    if (!d) return "—";
    const diff = Math.round((Date.now() - d.getTime()) / 1000);
    if (diff < 5) return "Just now";
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location Sharing</Text>
        <Text style={styles.subtitle}>
          Share your real-time location with trusted contacts
        </Text>
      </View>

      {/* ── Live Sharing Toggle ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View
              style={[
                styles.iconCircle,
                isLiveSharing ? styles.iconActive : styles.iconInactive,
              ]}
            >
              <MaterialIcons
                name="share"
                size={18}
                color={isLiveSharing ? "#16A34A" : "#64748B"}
              />
            </View>
            <View>
              <Text style={styles.rowTitle}>Live Location Sharing</Text>
              <Text style={styles.rowSub}>
                {shareLoading
                  ? "Please wait…"
                  : isLiveSharing
                  ? "Active"
                  : "Inactive"}
              </Text>
            </View>
          </View>
          {shareLoading ? (
            <ActivityIndicator size="small" color="#7C3AED" />
          ) : (
            <Switch
              value={isLiveSharing}
              onValueChange={handleToggleSharing}
              trackColor={{ true: "#7C3AED" }}
            />
          )}
        </View>

        {isLiveSharing && (
          <View style={styles.activeBanner}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              Sharing live location with {contacts.length} contact
              {contacts.length !== 1 ? "s" : ""}
            </Text>
          </View>
        )}

        {shareError ? (
          <Text style={styles.errorText}>{shareError}</Text>
        ) : null}
      </View>

      {/* ── Current Location ── */}
      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <MaterialIcons name="place" size={18} color="#7C3AED" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Current Location</Text>
              {locationLoading ? (
                <Text style={styles.rowSub}>Fetching location…</Text>
              ) : location ? (
                <>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {location.address ?? `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Updated: {formatUpdatedAt(location.updatedAt)}
                  </Text>
                </>
              ) : (
                <Text style={styles.rowSub}>Location unavailable</Text>
              )}
            </View>
          </View>
          <Pressable onPress={refreshLocation} disabled={locationLoading} style={styles.refreshBtn}>
            <MaterialIcons
              name="refresh"
              size={18}
              color={locationLoading ? "#CBD5E1" : "#7C3AED"}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Contacts ── */}
      <View style={styles.contactsHeader}>
        <Text style={styles.sectionTitle}>Emergency Contacts</Text>
        <View style={styles.badge}>
          <MaterialIcons name="people" size={12} color="#7C3AED" />
          <Text style={styles.badgeText}>
            {contactsLoading ? "…" : contacts.length} contact{contacts.length !== 1 ? "s" : ""}
          </Text>
        </View>
      </View>

      {contactsLoading ? (
        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color="#7C3AED" />
          <Text style={styles.loaderText}>Loading contacts…</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyCard}>
          <MaterialIcons name="people-outline" size={32} color="#CBD5E1" />
          <Text style={styles.emptyText}>
            No emergency contacts yet. Add them from the Contacts tab.
          </Text>
        </View>
      ) : (
        <View style={styles.contactList}>
          {contacts.map((contact) => (
            <View key={contact.contact_id} style={styles.contactCard}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {contact.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{contact.name}</Text>
                  <Text style={styles.rowSub}>{contact.phone_number}</Text>
                  {contact.relationship ? (
                    <Text style={styles.rowMeta}>{contact.relationship}</Text>
                  ) : null}
                </View>
                <View
                  style={[
                    styles.statusPill,
                    isLiveSharing ? styles.statusPillActive : styles.statusPillInactive,
                  ]}
                >
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: isLiveSharing ? "#16A34A" : "#94A3B8" },
                    ]}
                  />
                  <Text
                    style={[
                      styles.statusText,
                      { color: isLiveSharing ? "#16A34A" : "#64748B" },
                    ]}
                  >
                    {isLiveSharing ? "Sharing" : "Off"}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Refresh contacts ── */}
      <Pressable style={styles.refreshContactsBtn} onPress={fetchContacts} disabled={contactsLoading}>
        <MaterialIcons name="sync" size={16} color="#7C3AED" />
        <Text style={styles.refreshContactsBtnText}>
          {contactsLoading ? "Refreshing…" : "Refresh Contacts"}
        </Text>
      </Pressable>

      {/* ── Info card ── */}
      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>How it works</Text>
        <View style={styles.optionRow}>
          <MaterialIcons name="toggle-on" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>
            Toggle sharing — your live GPS is sent every 10 seconds
          </Text>
        </View>
        <View style={styles.optionRow}>
          <MaterialIcons name="people" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>
            All emergency contacts can track your location via a secure link
          </Text>
        </View>
        <View style={styles.optionRow}>
          <MaterialIcons name="lock" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>
            Toggle off to stop sharing and revoke the link instantly
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 16,
    paddingBottom: 32,
    gap: 16,
    backgroundColor: "#F8FAFC",
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  header: { gap: 6 },
  title: { fontSize: 20, fontWeight: "700", color: "#0F172A" },
  subtitle: { color: "#64748B" },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  rowTitle: { fontWeight: "600", color: "#0F172A" },
  rowSub: { color: "#94A3B8", fontSize: 12 },
  rowMeta: { color: "#94A3B8", fontSize: 11, marginTop: 2 },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconActive: { backgroundColor: "#DCFCE7" },
  iconInactive: { backgroundColor: "#E2E8F0" },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16A34A",
  },
  activeText: { color: "#16A34A", fontSize: 12 },
  errorText: { color: "#DC2626", fontSize: 12 },
  refreshBtn: { padding: 4 },
  contactsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: "#0F172A" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: { color: "#7C3AED", fontSize: 12, fontWeight: "600" },
  loaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    justifyContent: "center",
  },
  loaderText: { color: "#64748B", fontSize: 13 },
  emptyCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyText: { color: "#64748B", textAlign: "center", fontSize: 13 },
  contactList: { gap: 10 },
  contactCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E9D5FF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#7C3AED", fontWeight: "700", fontSize: 16 },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  statusPillActive: { borderColor: "#BBF7D0", backgroundColor: "#F0FDF4" },
  statusPillInactive: { borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 11, fontWeight: "600" },
  refreshContactsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#DDD6FE",
    backgroundColor: "#F5F3FF",
  },
  refreshContactsBtnText: { color: "#7C3AED", fontWeight: "600", fontSize: 13 },
  infoCard: {
    backgroundColor: "#F5F3FF",
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  cardTitle: { fontWeight: "600", color: "#0F172A", marginBottom: 2 },
  optionRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  optionText: { color: "#475569", fontSize: 13, flex: 1, lineHeight: 18 },
});
