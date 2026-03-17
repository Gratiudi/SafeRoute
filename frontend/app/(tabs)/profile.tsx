import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth();
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    emergencyAlerts: true,
    safetyReminders: false,
  });
  const [stats, setStats] = useState({
    trips: 0,
    safeMiles: 0,
    alerts: 0,
    sosUsed: 0,
  });
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    const loadStats = async () => {
      try {
        setStatsError(null);
        const [routes, alerts] = await Promise.all([
          authedApiFetch('/api/routes', token),
          authedApiFetch('/api/sos/history', token),
        ]);

        const routeList = Array.isArray(routes) ? routes : [];
        const alertList = Array.isArray(alerts) ? alerts : [];
        const totalDistance = routeList.reduce(
          (acc, route) => acc + (Number(route.distance) || 0),
          0
        );
        const sosCount = alertList.filter((alert) => alert.type === 'SOS').length;

        setStats({
          trips: routeList.length,
          safeMiles: Math.round(totalDistance),
          alerts: alertList.length,
          sosUsed: sosCount,
        });
      } catch (e: any) {
        setStatsError(e?.message || 'Unable to load stats');
      }
    };

    loadStats();
  }, [token]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.full_name ?? 'SafeRoute').split(' ').map((n) => n[0]).join('')}
          </Text>
        </View>
        <Text style={styles.name}>{user?.full_name ?? 'SafeRoute User'}</Text>
        <Text style={styles.email}>{user?.email ?? 'account@saferoute.app'}</Text>
        <Pressable style={styles.outlineButton}>
          <Text style={styles.outlineButtonText}>Edit Profile</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Personal Information</Text>
        <View style={styles.infoRow}>
          <MaterialIcons name="person" size={18} color="#94A3B8" />
          <Text style={styles.infoText}>{user?.full_name ?? 'SafeRoute User'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="mail" size={18} color="#94A3B8" />
          <Text style={styles.infoText}>{user?.email ?? 'account@saferoute.app'}</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="call" size={18} color="#94A3B8" />
          <Text style={styles.infoText}>+251 95 987 6543</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialIcons name="place" size={18} color="#94A3B8" />
          <Text style={styles.infoText}>Addis Ababa, AA</Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Safety Settings</Text>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="notifications" size={20} color="#7C3AED" />
            <View>
              <Text style={styles.settingTitle}>Push Notifications</Text>
              <Text style={styles.settingSub}>Receive safety alerts</Text>
            </View>
          </View>
          <Switch
            value={settings.notifications}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, notifications: value }))}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="map" size={20} color="#16A34A" />
            <View>
              <Text style={styles.settingTitle}>Location Services</Text>
              <Text style={styles.settingSub}>Share your location</Text>
            </View>
          </View>
          <Switch
            value={settings.locationSharing}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, locationSharing: value }))}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="security" size={20} color="#DC2626" />
            <View>
              <Text style={styles.settingTitle}>Emergency Alerts</Text>
              <Text style={styles.settingSub}>Critical safety warnings</Text>
            </View>
          </View>
          <Switch
            value={settings.emergencyAlerts}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, emergencyAlerts: value }))}
          />
        </View>
        <View style={styles.settingRow}>
          <View style={styles.settingLeft}>
            <MaterialIcons name="lightbulb" size={20} color="#F97316" />
            <View>
              <Text style={styles.settingTitle}>Safety Reminders</Text>
              <Text style={styles.settingSub}>Periodic safety tips</Text>
            </View>
          </View>
          <Switch
            value={settings.safetyReminders}
            onValueChange={(value) => setSettings((prev) => ({ ...prev, safetyReminders: value }))}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Safety Stats</Text>
        <View style={styles.statsGrid}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>{stats.trips}</Text>
            <Text style={styles.statLabel}>Trips Tracked</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#16A34A' }]}>{stats.safeMiles}</Text>
            <Text style={styles.statLabel}>Safe Miles</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#7C3AED' }]}>{stats.alerts}</Text>
            <Text style={styles.statLabel}>Alerts Received</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: '#DC2626' }]}>{stats.sosUsed}</Text>
            <Text style={styles.statLabel}>SOS Used</Text>
          </View>
        </View>
        {statsError ? <Text style={styles.statsError}>{statsError}</Text> : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Account</Text>
        <Pressable style={styles.outlineButtonRow}>
          <MaterialIcons name="lock" size={16} color="#0F172A" />
          <Text style={styles.outlineButtonRowText}>Change Password</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={signOut}>
          <MaterialIcons name="logout" size={16} color="#DC2626" />
          <Text style={styles.logoutText}>Sign Out</Text>
        </Pressable>
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
    backgroundColor: '#F8FAFC',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#C084FC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  email: {
    color: '#64748B',
  },
  outlineButton: {
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outlineButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    color: '#475569',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  settingTitle: {
    color: '#0F172A',
    fontWeight: '600',
  },
  settingSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stat: {
    width: '47%',
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  statsError: {
    color: '#DC2626',
    fontSize: 12,
  },
  outlineButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outlineButtonRowText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  logoutText: {
    color: '#DC2626',
    fontWeight: '600',
  },
});

