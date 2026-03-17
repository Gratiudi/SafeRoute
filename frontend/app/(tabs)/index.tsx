import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';

export default function HomeScreen() {
  const { user, token } = useAuth();
  const router = useRouter();
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [mediumOpen, setMediumOpen] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState<string | null>(null);
  const [mediumLoading, setMediumLoading] = useState(false);
  const [mediumError, setMediumError] = useState<string | null>(null);
  const [mediumAlertId, setMediumAlertId] = useState<string | null>(null);
  const [mediumExpiresAt, setMediumExpiresAt] = useState<string | null>(null);
  const [mediumRemaining, setMediumRemaining] = useState<number | null>(null);
  const [mediumEscalating, setMediumEscalating] = useState(false);

  const mediumActive = useMemo(() => !!mediumAlertId && !!mediumExpiresAt, [mediumAlertId, mediumExpiresAt]);

  useEffect(() => {
    if (!mediumExpiresAt) return;

    const updateRemaining = () => {
      const remainingMs = new Date(mediumExpiresAt).getTime() - Date.now();
      const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
      setMediumRemaining(seconds);
      return seconds;
    };

    updateRemaining();
    const interval = setInterval(() => {
      const seconds = updateRemaining();
      if (seconds <= 0) {
        clearInterval(interval);
        if (!mediumEscalating) {
          void handleMediumEscalate();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mediumExpiresAt, mediumEscalating]);

  const resetMediumState = () => {
    setMediumAlertId(null);
    setMediumExpiresAt(null);
    setMediumRemaining(null);
    setMediumEscalating(false);
  };

  const handleStartSos = async () => {
    if (!token || sosLoading) return;
    setSosError(null);
    setSosLoading(true);
    try {
      await authedApiFetch('/api/sos/start', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SOS' }),
      });
      setEmergencyOpen(false);
    } catch (error: any) {
      setSosError(error?.message || 'Failed to start SOS');
    } finally {
      setSosLoading(false);
    }
  };

  const handleMediumStart = async () => {
    if (!token || mediumLoading) return;
    setMediumError(null);
    setMediumLoading(true);
    try {
      const result = await authedApiFetch('/api/medium/start', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ duration_seconds: 60 }),
      });
      setMediumAlertId(result.alert_id);
      setMediumExpiresAt(result.expires_at);
    } catch (error: any) {
      setMediumError(error?.message || 'Failed to start timer');
    } finally {
      setMediumLoading(false);
    }
  };

  const handleMediumConfirm = async () => {
    if (!token || !mediumAlertId || mediumLoading) return;
    setMediumError(null);
    setMediumLoading(true);
    try {
      await authedApiFetch('/api/medium/confirm', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: mediumAlertId }),
      });
      resetMediumState();
      setMediumOpen(false);
    } catch (error: any) {
      setMediumError(error?.message || 'Unable to confirm safety');
    } finally {
      setMediumLoading(false);
    }
  };

  const handleMediumEscalate = async () => {
    if (!token || !mediumAlertId || mediumEscalating) return;
    setMediumError(null);
    setMediumEscalating(true);
    try {
      await authedApiFetch('/api/medium/escalate', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: mediumAlertId }),
      });
      resetMediumState();
      setMediumOpen(false);
    } catch (error: any) {
      setMediumError(error?.message || 'Escalation failed');
    } finally {
      setMediumEscalating(false);
    }
  };

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Welcome back{user?.full_name ? `, ${user.full_name}` : ''}!
        </Text>
        <Text style={styles.heroSubtitle}>Stay safe on your journey</Text>
      </View>

      <View style={styles.grid}>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/explore')}>
          <MaterialIcons name="map" size={28} color="#7C3AED" />
          <Text style={styles.actionTitle}>Safe Routes</Text>
          <Text style={styles.actionSub}>Navigate safely</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/share')}>
          <MaterialIcons name="share" size={28} color="#7C3AED" />
          <Text style={styles.actionTitle}>Share Location</Text>
          <Text style={styles.actionSub}>With contacts</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/contacts')}>
          <MaterialIcons name="people" size={28} color="#0D9488" />
          <Text style={styles.actionTitle}>Safe Contacts</Text>
          <Text style={styles.actionSub}>Emergency list</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/profile')}>
          <MaterialIcons name="person" size={28} color="#F97316" />
          <Text style={styles.actionTitle}>My Profile</Text>
          <Text style={styles.actionSub}>Settings & evidence</Text>
        </Pressable>
      </View>

      <View style={styles.sosArea}>
        <Pressable style={styles.sosButton} onPress={() => setEmergencyOpen(true)}>
          <MaterialIcons name="report" size={22} color="#FFFFFF" />
          <Text style={styles.sosText}>EMERGENCY SOS</Text>
        </Pressable>
        <Pressable style={styles.mediumButton} onPress={() => setMediumOpen(true)}>
          <MaterialIcons name="warning" size={20} color="#EA580C" />
          <Text style={styles.mediumText}>I Feel Unsafe</Text>
        </Pressable>
      </View>

      <Modal transparent visible={emergencyOpen} animationType="fade" onRequestClose={() => setEmergencyOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEmergencyOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency SOS</Text>
            <Text style={styles.modalBody}>
              Triggering SOS will alert your emergency contacts and start evidence recording.
            </Text>
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEmergencyOpen(false)} style={styles.modalButtonGhost}>
                <Text style={styles.modalButtonGhostText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleStartSos} style={styles.modalButtonDanger} disabled={sosLoading}>
                <Text style={styles.modalButtonDangerText}>
                  {sosLoading ? 'Starting...' : 'Start SOS'}
                </Text>
              </Pressable>
            </View>
            {sosError ? <Text style={styles.modalError}>{sosError}</Text> : null}
          </View>
        </View>
      </Modal>

      <Modal transparent visible={mediumOpen} animationType="fade" onRequestClose={() => setMediumOpen(false)}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setMediumOpen(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>I Feel Unsafe</Text>
            <Text style={styles.modalBody}>
              We will monitor your location and ask for a check-in. Escalate to SOS if needed.
            </Text>
            {mediumActive ? (
              <View style={styles.timerBlock}>
                <Text style={styles.timerLabel}>Check-in timer</Text>
                <Text style={styles.timerValue}>{formatCountdown(mediumRemaining)}</Text>
              </View>
            ) : null}
            <View style={styles.modalActions}>
              {mediumActive ? (
                <>
                  <Pressable onPress={handleMediumConfirm} style={styles.modalButtonGhost} disabled={mediumLoading}>
                    <Text style={styles.modalButtonGhostText}>
                      {mediumLoading ? 'Updating...' : "I'm Safe"}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={handleMediumEscalate}
                    style={styles.modalButtonDanger}
                    disabled={mediumEscalating}
                  >
                    <Text style={styles.modalButtonDangerText}>
                      {mediumEscalating ? 'Escalating...' : 'Escalate Now'}
                    </Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Pressable onPress={() => setMediumOpen(false)} style={styles.modalButtonGhost}>
                    <Text style={styles.modalButtonGhostText}>Dismiss</Text>
                  </Pressable>
                  <Pressable onPress={handleMediumStart} style={styles.modalButtonOutline} disabled={mediumLoading}>
                    <Text style={styles.modalButtonOutlineText}>
                      {mediumLoading ? 'Starting...' : 'Start Timer'}
                    </Text>
                  </Pressable>
                </>
              )}
            </View>
            {mediumError ? <Text style={styles.modalError}>{mediumError}</Text> : null}
          </View>
        </View>
      </Modal>
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
  hero: {
    gap: 6,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  heroSubtitle: {
    color: '#64748B',
    lineHeight: 20,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionTitle: {
    fontWeight: '600',
    color: '#0F172A',
  },
  actionSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  sosArea: {
    gap: 12,
    marginTop: 12,
  },
  sosButton: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 18,
    borderRadius: 16,
    shadowColor: '#DC2626',
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  sosText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  mediumButton: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FDBA74',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#FFF7ED',
  },
  mediumText: {
    color: '#EA580C',
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalBody: {
    color: '#475569',
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButtonGhost: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  modalButtonGhostText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  modalButtonDanger: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#DC2626',
  },
  modalButtonDangerText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalButtonOutline: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FDBA74',
  },
  modalButtonOutlineText: {
    color: '#EA580C',
    fontWeight: '600',
  },
  modalError: {
    color: '#DC2626',
    fontSize: 12,
  },
  timerBlock: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDBA74',
    alignItems: 'center',
    gap: 6,
  },
  timerLabel: {
    color: '#9A3412',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  timerValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#EA580C',
  },
});

