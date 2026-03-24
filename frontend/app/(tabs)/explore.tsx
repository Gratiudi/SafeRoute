import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';

type ApiRoute = {
  id: string;
  label: string;
  distance_km: number;
  duration_min: number;
  safety_score: number;
};

type TimeOfDay = 'day' | 'night' | 'auto';

export default function RoutesScreen() {
  const { token } = useAuth();
  const [start, setStart] = useState('');
  const [destination, setDestination] = useState('');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('auto');
  const [routes, setRoutes] = useState<ApiRoute[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const showRoutes = routes.length > 0;

  const bestRouteId = useMemo(() => {
    if (!routes.length) return null;
    return routes.reduce((best, route) => {
      if (!best) return route;
      return route.safety_score > best.safety_score ? route : best;
    }, routes[0]).id;
  }, [routes]);

  const handleSearch = async () => {
    if (!token) {
      setError('Please sign in to request safe routes.');
      return;
    }
    if (!destination.trim()) {
      setError('Enter a destination to continue.');
      return;
    }
    setError(null);
    setLoading(true);
    setNote(null);
    try {
      const payload: Record<string, any> = {
        start_location_name: start.trim() || undefined,
        end_location_name: destination.trim(),
      };
      if (timeOfDay !== 'auto') payload.time_of_day = timeOfDay;

      const result = await authedApiFetch('/api/safe-route/plan', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      setRoutes(Array.isArray(result?.routes) ? result.routes : []);
      setNote(result?.note ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch routes');
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Safe Route Navigation</Text>
        <Text style={styles.subtitle}>Find the safest path to your destination</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.currentRow}>
          <View style={styles.dot} />
          <Text style={styles.currentText}>Start location (optional)</Text>
        </View>
        <View style={styles.inputWrap}>
          <MaterialIcons name="place" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Enter start (optional)"
            value={start}
            onChangeText={setStart}
            style={styles.input}
          />
        </View>
        <View style={styles.inputWrap}>
          <MaterialIcons name="navigation" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Enter destination..."
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={handleSearch}
            style={styles.input}
          />
        </View>
        <View style={styles.timeRow}>
          {(['auto', 'day', 'night'] as TimeOfDay[]).map((value) => (
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
                {value === 'auto' ? 'Auto' : value === 'day' ? 'Day' : 'Night'}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable style={styles.primaryButton} onPress={handleSearch}>
          <MaterialIcons name="navigation" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>
            {loading ? 'Finding Routes...' : 'Find Safe Routes'}
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
                      ]}>
                      <Text style={styles.typeBadgeText}>
                        {route.id === bestRouteId ? 'Safest' : 'Option'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetaRow}>
                    <View style={styles.routeMeta}>
                      <MaterialIcons name="navigation" size={12} color="#94A3B8" />
                      <Text style={styles.routeMetaText}>
                        {route.distance_km.toFixed(2)} km
                      </Text>
                    </View>
                    <View style={styles.routeMeta}>
                      <MaterialIcons name="schedule" size={12} color="#94A3B8" />
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
                            percent >= 90 && { color: '#16A34A' },
                            percent < 90 && percent >= 75 && { color: '#CA8A04' },
                            percent < 75 && { color: '#DC2626' },
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

              <Pressable style={styles.primaryButton}>
                <Text style={styles.primaryButtonText}>Start Navigation</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.placeholderCard}>
          <MaterialIcons name="map" size={36} color="#94A3B8" />
          <Text style={styles.placeholderText}>Enter a destination to view safe routes</Text>
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
    backgroundColor: '#F8FAFC',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  header: {
    gap: 6,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  currentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B5CF6',
  },
  currentText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  input: {
    flex: 1,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  timePill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  timePillActive: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  timePillText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  timePillTextActive: {
    color: '#6D28D9',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C3AED',
    paddingVertical: 12,
    borderRadius: 12,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  routesSection: {
    gap: 12,
  },
  routesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#16A34A',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
  routeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  routeTop: {
    flexDirection: 'row',
    gap: 12,
  },
  routeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  routeName: {
    fontWeight: '600',
    color: '#0F172A',
  },
  typeBadge: {
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  typeBadgeGreen: {
    backgroundColor: '#DCFCE7',
  },
  typeBadgeBlue: {
    backgroundColor: '#EDE9FE',
  },
  typeBadgeText: {
    fontSize: 11,
    color: '#0F172A',
  },
  routeMetaRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  routeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  routeMetaText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  score: {
    alignItems: 'flex-end',
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 10,
    color: '#94A3B8',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    backgroundColor: '#FEF9C3',
    borderRadius: 10,
  },
  alertText: {
    fontSize: 11,
    color: '#A16207',
  },
  placeholderCard: {
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  placeholderText: {
    color: '#64748B',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
  },
  noteText: {
    color: '#475569',
    fontSize: 12,
  },
});

