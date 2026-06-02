import React, { useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useAuth } from "@/lib/auth";
import { authedApiFetch } from "@/lib/api";
import { MapView, Marker, Polyline } from "@/components/map-view";
import * as Location from "expo-location";

type RouteGeometry = {
  type: string;
  coordinates: [number, number][];
};

type ApiRoute = {
  id: string;
  label: string;
  distance_km: number;
  duration_min: number;
  safety_score: number;
  geometry?: RouteGeometry;
};

type TimeOfDay = "day" | "night" | "auto";

export default function RoutesScreen() {
  const { token } = useAuth();
  const [start, setStart] = useState("");
  const [destination, setDestination] = useState("");
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>("auto");
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [navigatingRouteId, setNavigatingRouteId] = useState<string | null>(null);
  const [savedRouteDbId, setSavedRouteDbId] = useState<string | null>(null);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [ratingScore, setRatingScore] = useState<number>(5);
  const [ratingComment, setRatingComment] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  const showRoutes = routes.length > 0;

  const bestRouteId = useMemo(() => {
    if (!routes.length) return null;
    return routes.reduce((best, route) => {
      if (!best) return route;
      return route.safety_score > best.safety_score ? route : best;
    }, routes[0]).id;
  }, [routes]);

  const selectedRoute = useMemo(() => {
    if (!routes.length) return null;
    return routes.find((route) => route.id === bestRouteId) ?? routes[0];
  }, [routes, bestRouteId]);

  const lineCoords = useMemo(() => {
    const coords = selectedRoute?.geometry?.coordinates;
    if (!coords || !Array.isArray(coords)) return [];
    return coords
      .map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
      .filter(
        (point) =>
          Number.isFinite(point.latitude) && Number.isFinite(point.longitude),
      );
  }, [selectedRoute]);

  const mapRegion = useMemo(() => {
    if (!lineCoords.length) return null;
    const lats = lineCoords.map((c) => c.latitude);
    const lngs = lineCoords.map((c) => c.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const latitude = (minLat + maxLat) / 2;
    const longitude = (minLng + maxLng) / 2;
    const latitudeDelta = Math.max(0.01, (maxLat - minLat) * 1.4);
    const longitudeDelta = Math.max(0.01, (maxLng - minLng) * 1.4);
    return { latitude, longitude, latitudeDelta, longitudeDelta };
  }, [lineCoords]);

  // Now properly wired — sets start coords in state for the search
  const [startCoords, setStartCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const handleUseMyLocation = async () => {
    setLocating(true);
    setError(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied.");
        return;
      }
      const location = await Location.getCurrentPositionAsync({});
      setStartCoords({
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      });
      setStart("My Location");
    } catch {
      setError("Could not get your location.");
    } finally {
      setLocating(false);
    }
  };

  const handleSearch = async () => {
    if (!token) {
      setError("Please sign in to request safe routes.");
      return;
    }
    if (!destination.trim()) {
      setError("Enter a destination to continue.");
      return;
    }
    setError(null);
    setLoading(true);
    setNote(null);
    try {
      const payload: Record<string, any> = {
        end_location_name: destination.trim(),
      };

      let activeStartCoords = startCoords;
      let activeStartText = start.trim();

      // Automatically fetch current GPS location if start field is left blank
      if (!activeStartText && !activeStartCoords) {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === "granted") {
            const location = await Location.getCurrentPositionAsync({});
            const coords = {
              lat: location.coords.latitude,
              lng: location.coords.longitude,
            };
            setStartCoords(coords);
            setStart("My Location");
            activeStartCoords = coords;
          } else {
            // Fallback to "Addis Ababa" if permission is denied
            activeStartText = "Addis Ababa";
            setStart("Addis Ababa");
          }
        } catch (err) {
          // Fallback if location services are disabled or fail
          activeStartText = "Addis Ababa";
          setStart("Addis Ababa");
        }
      }

      // Use real GPS coords if available, otherwise use text
      if (activeStartCoords) {
        payload.start_lat = activeStartCoords.lat;
        payload.start_lng = activeStartCoords.lng;
      } else if (activeStartText) {
        payload.start_location_name = activeStartText;
      }

      if (timeOfDay !== "auto") payload.time_of_day = timeOfDay;

      const result = await authedApiFetch("/api/safe-route/plan", token, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setRoutes(Array.isArray(result?.routes) ? result.routes : []);
      setNote(result?.note ?? null);
    } catch (e: any) {
      setError(e?.message || "Failed to fetch routes");
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNavigation = async (routeId: string) => {
    setNavigatingRouteId(routeId);
    setIsNavigating(true);

    // Save the route to the database so we get a real UUID for the rating FK
    const route = routes.find((r) => r.id === routeId);
    if (route && token) {
      try {
        const saved = await authedApiFetch("/api/routes", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            distance: route.distance_km,
            duration: route.duration_min,
            safety_score: route.safety_score,
          }),
        });
        // Store the real database route_id for use when submitting the rating
        setSavedRouteDbId(saved?.route_id ?? null);
      } catch (e) {
        console.error("Failed to save route to DB:", e);
        setSavedRouteDbId(null);
      }
    }
  };

  const handleFinishNavigation = () => {
    setIsNavigating(false);
    setShowRatingModal(true);
  };

  const submitRating = async () => {
    if (!token) return;
    setSubmittingRating(true);
    try {
      // Only submit a rating if we have a real persisted route_id
      if (savedRouteDbId) {
        await authedApiFetch("/api/ratings", token, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            route_id: savedRouteDbId,
            score: ratingScore,
            comment: ratingComment.trim() || undefined,
          }),
        });
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setSubmittingRating(false);
      setShowRatingModal(false);
      setNavigatingRouteId(null);
      setSavedRouteDbId(null);
      setRatingScore(5);
      setRatingComment("");
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Safe Route Navigation</Text>
        <Text style={styles.subtitle}>
          Find the safest path to your destination
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.currentRow}>
          <View style={styles.dot} />
          <Text style={styles.currentText}>Start location (optional)</Text>
        </View>

        {/* Start input row with "Use my location" button */}
        <View style={styles.inputWrap}>
          <MaterialIcons name="place" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Enter start (optional)"
            value={start}
            onChangeText={(text) => {
              setStart(text);
              // Clear GPS coords if user manually types
              if (startCoords) setStartCoords(null);
            }}
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: '#0F172A' }]}
          />
          <Pressable onPress={handleUseMyLocation} disabled={locating}>
            <MaterialIcons
              name="my-location"
              size={18}
              color={locating ? "#94A3B8" : "#7C3AED"}
            />
          </Pressable>
        </View>

        <View style={styles.inputWrap}>
          <MaterialIcons name="navigation" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Enter destination..."
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={handleSearch}
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: '#0F172A' }]}
          />
        </View>

        <View style={styles.timeRow}>
          {(["auto", "day", "night"] as TimeOfDay[]).map((value) => (
            <Pressable
              key={value}
              style={[
                styles.timePill,
                timeOfDay === value && styles.timePillActive,
              ]}
              onPress={() => setTimeOfDay(value)}
            >
              <Text
                style={[
                  styles.timePillText,
                  timeOfDay === value && styles.timePillTextActive,
                ]}
              >
                {value === "auto" ? "Auto" : value === "day" ? "Day" : "Night"}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.primaryButton} onPress={handleSearch}>
          <MaterialIcons name="navigation" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {loading ? "Finding Routes..." : "Find Safe Routes"}
          </Text>
        </Pressable>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {note ? <Text style={styles.noteText}>{note}</Text> : null}
      </View>

      {showRoutes ? (
        <View style={styles.routesSection}>
          <View style={styles.routesHeader}>
            <Text style={styles.sectionTitle}>Available Routes</Text>
            <View style={styles.badge}>
              <MaterialIcons name="security" size={12} color="#16A34A" />
              <Text style={styles.badgeText}>Safe</Text>
            </View>
          </View>

          {lineCoords.length > 0 && mapRegion ? (
            <MapView
              key={`${selectedRoute?.id}-${lineCoords.length}`}
              style={styles.map}
              initialRegion={mapRegion}
              showsUserLocation
            >
              <Polyline
                coordinates={lineCoords}
                strokeColor="#7C3AED"
                strokeWidth={4}
              />
              <Marker coordinate={lineCoords[0]} title="Start" />
              <Marker
                coordinate={lineCoords[lineCoords.length - 1]}
                title="End"
              />
            </MapView>
          ) : (
            <View style={styles.mapHint}>
              <MaterialIcons name="map" size={16} color="#94A3B8" />
              <Text style={styles.mapHintText}>
                Map preview is available when route geometry is provided.
              </Text>
            </View>
          )}

          {routes.map((route) => (
            <View key={route.id} style={styles.routeCard}>
              <View style={styles.routeTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.routeTitleRow}>
                    <Text style={styles.routeName}>{route.label}</Text>
                    <View
                      style={[
                        styles.typeBadge,
                        route.id === bestRouteId && styles.typeBadgeGreen,
                      ]}
                    >
                      <Text style={styles.typeBadgeText}>
                        {route.id === bestRouteId ? "Safest" : "Option"}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetaRow}>
                    <View style={styles.routeMeta}>
                      <MaterialIcons
                        name="navigation"
                        size={12}
                        color="#94A3B8"
                      />
                      <Text style={styles.routeMetaText}>
                        {route.distance_km.toFixed(2)} km
                      </Text>
                    </View>
                    <View style={styles.routeMeta}>
                      <MaterialIcons
                        name="schedule"
                        size={12}
                        color="#94A3B8"
                      />
                      <Text style={styles.routeMetaText}>
                        {route.duration_min.toFixed(1)} min
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.score}>
                  {(() => {
                    const percent = Math.round((route.safety_score || 0) * 100);
                    return (
                      <>
                        <Text
                          style={[
                            styles.scoreValue,
                            percent >= 90 && { color: "#16A34A" },
                            percent < 90 &&
                              percent >= 75 && { color: "#CA8A04" },
                            percent < 75 && { color: "#DC2626" },
                          ]}
                        >
                          {percent}%
                        </Text>
                        <Text style={styles.scoreLabel}>Safety</Text>
                      </>
                    );
                  })()}
                </View>
              </View>

              {isNavigating && navigatingRouteId === route.id ? (
                <Pressable style={[styles.primaryButton, { backgroundColor: '#DC2626' }]} onPress={handleFinishNavigation}>
                  <Text style={styles.primaryButtonText}>Finish Navigation</Text>
                </Pressable>
              ) : !isNavigating ? (
                <Pressable style={styles.primaryButton} onPress={() => handleStartNavigation(route.id)}>
                  <Text style={styles.primaryButtonText}>Start Navigation</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.placeholderCard}>
          <MaterialIcons name="map" size={36} color="#94A3B8" />
          <Text style={styles.placeholderText}>
            Enter a destination to view safe routes
          </Text>
        </View>
      )}

      {showRatingModal && (
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Rate Your Route</Text>
            <Text style={styles.modalBody}>How safe did you feel on this route?</Text>
            
            <View style={styles.ratingStars}>
              {[1, 2, 3, 4, 5].map((s) => (
                <Pressable key={s} onPress={() => setRatingScore(s)}>
                  <MaterialIcons name="star" size={32} color={s <= ratingScore ? '#EAB308' : '#E2E8F0'} />
                </Pressable>
              ))}
            </View>
            
            <TextInput
              style={[styles.input, { minHeight: 80, marginTop: 12 }]}
              placeholder="Any comments about safety? (optional)"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
            />
            
            <View style={styles.modalActions}>
              <Pressable onPress={() => setShowRatingModal(false)} style={styles.modalButtonGhost} disabled={submittingRating}>
                <Text style={styles.modalButtonGhostText}>Skip</Text>
              </Pressable>
              <Pressable onPress={submitRating} style={styles.modalButtonPrimary} disabled={submittingRating}>
                <Text style={styles.modalButtonPrimaryText}>{submittingRating ? 'Submitting...' : 'Submit Rating'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
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
  currentRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#8B5CF6" },
  currentText: { color: "#94A3B8", fontSize: 12 },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
  },
  input: { flex: 1, color: '#0F172A' },
  timeRow: { flexDirection: "row", gap: 8 },
  timePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  timePillActive: { borderColor: "#7C3AED", backgroundColor: "#EDE9FE" },
  timePillText: { fontSize: 12, color: "#64748B", fontWeight: "600" },
  timePillTextActive: { color: "#6D28D9" },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: { color: "#FFFFFF", fontWeight: "600" },
  routesSection: { gap: 12 },
  routesHeader: {
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
    borderColor: "#16A34A",
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: { color: "#16A34A", fontSize: 12, fontWeight: "600" },
  routeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  routeTop: { flexDirection: "row", gap: 12 },
  routeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  routeName: { fontWeight: "600", color: "#0F172A" },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: "#E2E8F0",
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  typeBadgeGreen: { backgroundColor: "#DCFCE7" },
  typeBadgeText: { fontSize: 11, color: "#0F172A" },
  routeMetaRow: { flexDirection: "row", gap: 12, marginTop: 6 },
  routeMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  routeMetaText: { fontSize: 12, color: "#94A3B8" },
  score: { alignItems: "flex-end" },
  scoreValue: { fontSize: 18, fontWeight: "700" },
  scoreLabel: { fontSize: 10, color: "#94A3B8" },
  placeholderCard: {
    backgroundColor: "#E2E8F0",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  placeholderText: { color: "#64748B", textAlign: "center" },
  map: { width: "100%", height: 240, borderRadius: 12 },
  mapHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
  },
  mapHintText: { color: "#64748B", fontSize: 12 },
  errorText: { color: "#DC2626", fontSize: 12 },
  noteText: { color: "#475569", fontSize: 12 },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 100,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A', textAlign: 'center' },
  modalBody: { color: '#475569', fontSize: 14, textAlign: 'center' },
  ratingStars: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginVertical: 8 },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 12 },
  modalButtonGhost: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#F1F5F9', alignItems: 'center' },
  modalButtonGhostText: { color: '#0F172A', fontWeight: '600' },
  modalButtonPrimary: { flex: 1, paddingVertical: 10, borderRadius: 10, backgroundColor: '#7C3AED', alignItems: 'center' },
  modalButtonPrimaryText: { color: '#FFFFFF', fontWeight: '600' },
});
