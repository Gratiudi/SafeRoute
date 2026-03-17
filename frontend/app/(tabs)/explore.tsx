import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Route = {
  id: number;
  name: string;
  distance: string;
  duration: string;
  safetyScore: number;
  alerts: number;
  type: 'safest' | 'fastest' | 'shortest';
};

const routes: Route[] = [
  { id: 1, name: 'Main Street Route', distance: '3.2 km', duration: '12 min', safetyScore: 95, alerts: 0, type: 'safest' },
  { id: 2, name: 'Highway Route', distance: '2.8 km', duration: '8 min', safetyScore: 78, alerts: 2, type: 'fastest' },
  { id: 3, name: 'Scenic Route', distance: '2.5 km', duration: '15 min', safetyScore: 88, alerts: 1, type: 'shortest' },
];

export default function RoutesScreen() {
  const [destination, setDestination] = useState('');
  const [showRoutes, setShowRoutes] = useState(false);

  const handleSearch = () => {
    if (destination.trim()) setShowRoutes(true);
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
          <Text style={styles.currentText}>Current Location</Text>
        </View>
        <View style={styles.inputWrap}>
          <MaterialIcons name="place" size={16} color="#94A3B8" />
          <TextInput
            placeholder="Enter destination..."
            value={destination}
            onChangeText={setDestination}
            onSubmitEditing={handleSearch}
            style={styles.input}
          />
        </View>
        <Pressable style={styles.primaryButton} onPress={handleSearch}>
          <MaterialIcons name="navigation" size={16} color="#FFFFFF" />
          <Text style={styles.primaryButtonText}>Find Safe Routes</Text>
        </Pressable>
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
                    <Text style={styles.routeName}>{route.name}</Text>
                    <View
                      style={[
                        styles.typeBadge,
                        route.type === 'safest' && styles.typeBadgeGreen,
                        route.type === 'fastest' && styles.typeBadgeBlue,
                      ]}>
                      <Text style={styles.typeBadgeText}>
                        {route.type === 'safest' ? 'Safest' : route.type === 'fastest' ? 'Fastest' : 'Shortest'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.routeMetaRow}>
                    <View style={styles.routeMeta}>
                      <MaterialIcons name="navigation" size={12} color="#94A3B8" />
                      <Text style={styles.routeMetaText}>{route.distance}</Text>
                    </View>
                    <View style={styles.routeMeta}>
                      <MaterialIcons name="schedule" size={12} color="#94A3B8" />
                      <Text style={styles.routeMetaText}>{route.duration}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.score}>
                  <Text
                    style={[
                      styles.scoreValue,
                      route.safetyScore >= 90 && { color: '#16A34A' },
                      route.safetyScore < 90 && route.safetyScore >= 75 && { color: '#CA8A04' },
                      route.safetyScore < 75 && { color: '#DC2626' },
                    ]}>
                    {route.safetyScore}%
                  </Text>
                  <Text style={styles.scoreLabel}>Safety</Text>
                </View>
              </View>

              {route.alerts > 0 ? (
                <View style={styles.alertBox}>
                  <MaterialIcons name="warning" size={14} color="#CA8A04" />
                  <Text style={styles.alertText}>
                    {route.alerts} active alert{route.alerts > 1 ? 's' : ''} on this route
                  </Text>
                </View>
              ) : null}

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
});

