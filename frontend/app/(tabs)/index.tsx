import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';
import { startEvidenceCapture, stopEvidenceCapture, uploadPhotoEvidence } from '@/lib/evidence';
import { useI18n } from '@/lib/i18n';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import { Camera, CameraView } from 'expo-camera';

type EmergencyContact = {
  contact_id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
};

export default function HomeScreen() {
  const { user, token } = useAuth();
  const { t, formatTimestamp } = useI18n();
  const router = useRouter();
  const { triggerSos } = useLocalSearchParams<{ triggerSos?: string }>();
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
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [smsWarning, setSmsWarning] = useState<string | null>(null);
  const [mediumDuration, setMediumDuration] = useState(60);
  const [mediumContacts, setMediumContacts] = useState<EmergencyContact[]>([]);
  const [selectedMediumContactIds, setSelectedMediumContactIds] = useState<string[]>([]);
  const [mediumContactsLoading, setMediumContactsLoading] = useState(false);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [sosCountdown, setSosCountdown] = useState<number | null>(null);

  const mediumActive = useMemo(() => !!mediumAlertId && !!mediumExpiresAt, [mediumAlertId, mediumExpiresAt]);

  const [activeSosAlertId, setActiveSosAlertId] = useState<string | null>(null);
  const [activeSosShareCode, setActiveSosShareCode] = useState<string | null>(null);
  const [activeSosOpen, setActiveSosOpen] = useState(false);
  const [activeSosDuration, setActiveSosDuration] = useState(0);

  const cameraRef = useRef<any>(null);
  const activeSosAlertIdRef = useRef<string | null>(null);
  const activeSosShareCodeRef = useRef<string | null>(null);
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    activeSosAlertIdRef.current = activeSosAlertId;
  }, [activeSosAlertId]);

  useEffect(() => {
    activeSosShareCodeRef.current = activeSosShareCode;
  }, [activeSosShareCode]);

  useEffect(() => {
    tokenRef.current = token;
  }, [token]);

  const updateLiveSosLocation = async () => {
    const shareCode = activeSosShareCodeRef.current;
    const tok = tokenRef.current;
    if (!shareCode || !tok) return;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({});
      await authedApiFetch('/api/location/share/update', tok, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          share_code: shareCode,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }),
      });
    } catch (err) {
      console.warn("[HomeScreen] Failed to update live SOS location:", err);
    }
  };

  const captureAndUploadPhoto = async () => {
    const aid = activeSosAlertIdRef.current;
    const tok = tokenRef.current;
    if (!aid || !tok) {
      console.log("[HomeScreen] Cannot capture photo: alert ID or token missing.");
      return;
    }
    try {
      let attempts = 0;
      while (!cameraRef.current && attempts < 20) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        attempts += 1;
      }
      if (!cameraRef.current) {
        console.log("[HomeScreen] Cannot capture photo: camera ref not ready.");
        return;
      }
      console.log("[HomeScreen] Capturing photo evidence...");
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
      });
      if (photo && photo.uri) {
        console.log("[HomeScreen] Photo captured. Uploading from uri:", photo.uri);
        await uploadPhotoEvidence(aid, tok, photo.uri);
      }
    } catch (err) {
      console.error("[HomeScreen] Photo capture/upload failed:", err);
    }
  };

  useEffect(() => {
    if (!token) return;
    void fetchAlertHistory();
    void fetchEmergencyContacts();
  }, [token]);

  const fetchEmergencyContacts = async () => {
    if (!token || mediumContactsLoading) return;
    setMediumContactsLoading(true);
    try {
      const data = await authedApiFetch('/api/emergency-contacts', token);
      setMediumContacts(Array.isArray(data) ? data : []);
    } catch {
      setMediumContacts([]);
    } finally {
      setMediumContactsLoading(false);
    }
  };

  // Active SOS timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (activeSosOpen) {
      interval = setInterval(() => {
        setActiveSosDuration((prev) => prev + 1);
      }, 1000);
    } else {
      setActiveSosDuration(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSosOpen]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (activeSosOpen && activeSosShareCode) {
      void updateLiveSosLocation();
      interval = setInterval(() => {
        void updateLiveSosLocation();
      }, 10000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeSosOpen, activeSosShareCode]);

  const hasEscalatedRef = React.useRef(false);

  useEffect(() => {
    if (!mediumExpiresAt) {
      hasEscalatedRef.current = false;
      return;
    }

    hasEscalatedRef.current = false;

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
        if (!hasEscalatedRef.current) {
          hasEscalatedRef.current = true;
          void handleMediumEscalate();
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [mediumExpiresAt]);

  const resetMediumState = () => {
    setMediumAlertId(null);
    setMediumExpiresAt(null);
    setMediumRemaining(null);
    setMediumEscalating(false);
  };

  const showStatus = (message: string) => {
    setStatusMessage(message);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const fetchAlertHistory = async () => {
    if (!token || alertsLoading) return;
    setAlertsLoading(true);
    try {
      const data = await authedApiFetch('/api/sos/history', token);
      setAlerts(Array.isArray(data) ? data : []);
    } catch {
      // ignore history fetch failures for now
    } finally {
      setAlertsLoading(false);
    }
  };

  useEffect(() => {
    if (sosCountdown === null) return;
    if (sosCountdown <= 0) {
      setSosCountdown(null);
      void executeSos();
      return;
    }
    const timer = setTimeout(() => {
      setSosCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    return () => clearTimeout(timer);
  }, [sosCountdown]);

  const handleStartSos = () => {
    setSosCountdown(5);
  };

  useEffect(() => {
    if (triggerSos !== '1') return;
    setEmergencyOpen(true);
    setSosCountdown(5);
    router.replace('/(tabs)');
  }, [triggerSos, router]);

  const cancelSosCountdown = () => {
    setSosCountdown(null);
    setEmergencyOpen(false);
  };

  const getEmergencyLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return {};

      const location = await Location.getCurrentPositionAsync({});
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch {
      return {};
    }
  };

  const executeSos = async () => {
    if (!token || sosLoading) return;
    setSosError(null);
    setSosLoading(true);
    setSmsWarning(null);
    try {
      // Request Camera and Audio permissions before starting capture
      try {
        await Camera.requestCameraPermissionsAsync();
        await Audio.requestPermissionsAsync();
      } catch (permissionErr) {
        console.warn("Failed to request camera/mic permissions:", permissionErr);
      }

      const locationPayload = await getEmergencyLocation();
      const result = await authedApiFetch('/api/sos/start', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SOS', ...locationPayload }),
      });
      const sms = Array.isArray(result?.sms) ? result.sms : [];
      if (!sms.length) {
        setSmsWarning('SOS created, but no SMS sent. Add contacts and check SMS provider settings.');
      }
      showStatus('SOS alert created.');
      
      setActiveSosOpen(true);
      setActiveSosAlertId(result.alert.alert_id);
      setActiveSosShareCode(result.share?.share_code ?? null);

      // Start sequential evidence capture: photo -> 30s audio -> photo -> upload -> repeat
      startEvidenceCapture(result.alert.alert_id, token, {
        capturePhoto: captureAndUploadPhoto,
      });

      void fetchAlertHistory();
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
    setSmsWarning(null);
    try {
      // Get user's current location
      const locationPayload = await getEmergencyLocation();
      
      const result = await authedApiFetch('/api/medium/start', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          duration_seconds: mediumDuration,
          notify_contact_ids: selectedMediumContactIds,
          ...locationPayload,
        }),
      });
      const sms = Array.isArray(result?.sms) ? result.sms : [];
      if (selectedMediumContactIds.length > 0 && !sms.length) {
        setSmsWarning('Timer started, but selected contacts were not notified. Check SMS provider settings.');
      }
      setMediumAlertId(result.alert_id);
      setMediumExpiresAt(result.expires_at);
      showStatus('Check-in timer started.');
      void fetchAlertHistory();
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
      setSelectedMediumContactIds([]);
      showStatus('Marked safe.');
      void fetchAlertHistory();
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
      // Request Camera and Audio permissions before starting capture
      try {
        await Camera.requestCameraPermissionsAsync();
        await Audio.requestPermissionsAsync();
      } catch (permissionErr) {
        console.warn("Failed to request camera/mic permissions:", permissionErr);
      }

      const locationPayload = await getEmergencyLocation();
      const result = await authedApiFetch('/api/medium/escalate', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: mediumAlertId, ...locationPayload }),
      });
      if (result && result.sos_alert) {
         setActiveSosOpen(true);
         setActiveSosAlertId(result.sos_alert.alert_id);
         setActiveSosShareCode(result.share?.share_code ?? null);
         startEvidenceCapture(result.sos_alert.alert_id, token, {
           capturePhoto: captureAndUploadPhoto,
         });
      }

      resetMediumState();
      setSelectedMediumContactIds([]);
      showStatus('Escalated to SOS.');
      void fetchAlertHistory();
      setMediumOpen(false);
    } catch (error: any) {
      setMediumError(error?.message || 'Escalation failed');
    } finally {
      setMediumEscalating(false);
    }
  };

  const handleStopSos = async () => {
    if (!token || !activeSosAlertId) return;
    try {
      await authedApiFetch('/api/sos/stop', token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_id: activeSosAlertId }),
      });
      if (activeSosShareCode) {
        try {
          await authedApiFetch('/api/location/share/stop', token, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ share_code: activeSosShareCode }),
          });
        } catch (shareStopError) {
          console.warn("[HomeScreen] Failed to stop live SOS location share:", shareStopError);
        }
      }
      stopEvidenceCapture();
      setActiveSosAlertId(null);
      setActiveSosShareCode(null);
      setActiveSosOpen(false);
      showStatus('SOS ended. Evidence saved.');
      void fetchAlertHistory();
    } catch (error: any) {
      showStatus('Failed to end SOS. Please try again.');
    }
  };

  const formatCountdown = (seconds: number | null) => {
    if (seconds === null) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const toggleMediumContact = (contactId: string) => {
    setSelectedMediumContactIds((prev) =>
      prev.includes(contactId)
        ? prev.filter((id) => id !== contactId)
        : [...prev, contactId]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          {t('welcome')}{user?.full_name ? `, ${user.full_name}` : ''}!
        </Text>
        <Text style={styles.heroSubtitle}>{t('staySafe')}</Text>
      </View>

      <View style={styles.grid}>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/explore')}>
          <MaterialIcons name="map" size={28} color="#7C3AED" />
          <Text style={styles.actionTitle}>{t('safeRoutes')}</Text>
          <Text style={styles.actionSub}>{t('navigateSafely')}</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/share')}>
          <MaterialIcons name="share" size={28} color="#7C3AED" />
          <Text style={styles.actionTitle}>{t('shareLocation')}</Text>
          <Text style={styles.actionSub}>With contacts</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/contacts')}>
          <MaterialIcons name="people" size={28} color="#0D9488" />
          <Text style={styles.actionTitle}>{t('safeContacts')}</Text>
          <Text style={styles.actionSub}>Emergency list</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => router.push('/(tabs)/profile')}>
          <MaterialIcons name="person" size={28} color="#F97316" />
          <Text style={styles.actionTitle}>{t('myProfile')}</Text>
          <Text style={styles.actionSub}>Settings & evidence</Text>
        </Pressable>
      </View>

      <View style={styles.sosArea}>
        <Pressable style={styles.sosButton} onPress={() => setEmergencyOpen(true)}>
          <MaterialIcons name="report" size={22} color="#FFFFFF" />
          <Text style={styles.sosText}>{t('emergencySos')}</Text>
        </Pressable>
        <Pressable style={styles.mediumButton} onPress={() => setMediumOpen(true)}>
          <MaterialIcons name="warning" size={20} color="#EA580C" />
          <Text style={styles.mediumText}>{t('iFeelUnsafe')}</Text>
        </Pressable>
        {statusMessage ? <Text style={styles.statusMessage}>{statusMessage}</Text> : null}
        {smsWarning ? <Text style={styles.smsWarning}>{smsWarning}</Text> : null}
      </View>

      <View style={styles.historyCard}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>{t('recentAlerts')}</Text>
          <Pressable onPress={fetchAlertHistory} disabled={alertsLoading}>
            <Text style={styles.historyRefresh}>{alertsLoading ? 'Refreshing...' : 'Refresh'}</Text>
          </Pressable>
        </View>
        {alerts.length === 0 ? (
          <Text style={styles.historyEmpty}>{t('noAlerts')}</Text>
        ) : (
          alerts.slice(0, 5).map((item) => (
            <View key={item.alert_id} style={styles.historyRow}>
              <Text style={styles.historyType}>{item.type}</Text>
              <Text style={styles.historyMeta}>
                {item.status} • {formatTimestamp(item.timestamp ?? item.created_at)}
              </Text>
            </View>
          ))
        )}
      </View>

      <Modal transparent visible={emergencyOpen} animationType="fade" onRequestClose={cancelSosCountdown}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={cancelSosCountdown} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Emergency SOS</Text>
            {sosCountdown !== null ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 48, fontWeight: 'bold', color: '#DC2626' }}>{sosCountdown}</Text>
                <Text style={{ fontSize: 16, color: '#475569', marginTop: 10 }}>Sending alert in...</Text>
                <Pressable onPress={cancelSosCountdown} style={[styles.modalButtonGhost, { marginTop: 20 }]}>
                  <Text style={styles.modalButtonGhostText}>Cancel SOS</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={styles.modalBody}>
                  Triggering SOS will alert your emergency contacts and start evidence recording.
                </Text>
                <View style={styles.modalActions}>
                  <Pressable onPress={cancelSosCountdown} style={styles.modalButtonGhost}>
                    <Text style={styles.modalButtonGhostText}>Cancel</Text>
                  </Pressable>
                  <Pressable onPress={handleStartSos} style={styles.modalButtonDanger} disabled={sosLoading}>
                    <Text style={styles.modalButtonDangerText}>
                      {sosLoading ? 'Starting...' : 'Start SOS'}
                    </Text>
                  </Pressable>
                </View>
                {sosError ? <Text style={styles.modalError}>{sosError}</Text> : null}
              </>
            )}
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
            {!mediumActive ? (
              <View style={styles.durationBlock}>
                <Text style={styles.durationLabel}>Set check-in timer</Text>
                <View style={styles.durationControls}>
                  <Pressable
                    style={styles.durationButton}
                    onPress={() => setMediumDuration((prev) => Math.max(15, prev - 15))}
                  >
                    <Text style={styles.durationButtonText}>-15s</Text>
                  </Pressable>
                  <Text style={styles.durationValue}>{formatCountdown(mediumDuration)}</Text>
                  <Pressable
                    style={styles.durationButton}
                    onPress={() => setMediumDuration((prev) => Math.min(300, prev + 15))}
                  >
                    <Text style={styles.durationButtonText}>+15s</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}
            {!mediumActive ? (
              <View style={styles.contactSelectBlock}>
                <View style={styles.contactSelectHeader}>
                  <Text style={styles.durationLabel}>Notify a contact now</Text>
                  <Pressable onPress={fetchEmergencyContacts} disabled={mediumContactsLoading}>
                    <Text style={styles.historyRefresh}>{mediumContactsLoading ? 'Loading...' : 'Refresh'}</Text>
                  </Pressable>
                </View>
                {mediumContacts.length === 0 ? (
                  <Text style={styles.contactSelectHint}>No contacts found. Add one from Emergency Contacts.</Text>
                ) : (
                  <View style={styles.contactSelectList}>
                    {mediumContacts.map((contact) => {
                      const selected = selectedMediumContactIds.includes(contact.contact_id);
                      return (
                        <Pressable
                          key={contact.contact_id}
                          style={[styles.contactChoice, selected && styles.contactChoiceSelected]}
                          onPress={() => toggleMediumContact(contact.contact_id)}
                        >
                          <MaterialIcons
                            name={selected ? 'check-circle' : 'radio-button-unchecked'}
                            size={18}
                            color={selected ? '#16A34A' : '#94A3B8'}
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={styles.contactChoiceName}>{contact.name}</Text>
                            <Text style={styles.contactChoiceMeta}>
                              {contact.relationship ? `${contact.relationship} • ` : ''}{contact.phone_number}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Text style={styles.contactSelectHint}>
                  Selected contacts get a check-in SMS now. If this escalates, all emergency contacts get the SOS alert.
                </Text>
              </View>
            ) : null}
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

      {/* Active SOS Activated State Modal (Figma UI) */}
      <Modal transparent visible={activeSosOpen} animationType="slide">
        <View style={styles.sosOverlay}>
          <View style={styles.sosContainer}>
            {activeSosOpen && (
              <CameraView
                ref={cameraRef}
                style={{ width: 1, height: 1, opacity: 0, position: 'absolute' }}
                facing="back"
                mode="picture"
              />
            )}
            <View style={styles.sosHeader}>
              <View style={styles.sosPulse}>
                <MaterialIcons name="report" size={36} color="#FFFFFF" />
              </View>
              <Text style={styles.sosAlertTitle}>SOS Activated!</Text>
              <Text style={styles.sosAlertSub}>Your emergency contacts have been notified</Text>
              <Text style={styles.sosTimerValue}>{formatCountdown(activeSosDuration)}</Text>
            </View>

            <ScrollView contentContainerStyle={styles.sosStatusList}>
              <View style={[styles.statusBox, styles.statusSuccess]}>
                <View style={styles.statusIconCircle}>
                  <MaterialIcons name="people" size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxTitle}>Alerting emergency contacts...</Text>
                  <Text style={styles.statusBoxSub}>SMS alert dispatched successfully</Text>
                </View>
                <MaterialIcons name="check-circle" size={16} color="#16A34A" />
              </View>

              <View style={[styles.statusBox, styles.statusSuccess]}>
                <View style={styles.statusIconCircle}>
                  <MaterialIcons name="my-location" size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxTitle}>Sharing your location...</Text>
                  <Text style={styles.statusBoxSub}>Live location link is active</Text>
                </View>
                <MaterialIcons name="check-circle" size={16} color="#16A34A" />
              </View>

              <View style={[styles.statusBox, styles.statusInfo, { borderColor: '#E9D5FF' }]}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#7C3AED' }]}>
                  <MaterialIcons name="mic" size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxTitle}>Recording audio evidence...</Text>
                  <Text style={styles.statusBoxSub}>Next capture in {30 - (activeSosDuration % 30)}s</Text>
                </View>
                <View style={styles.livePulseDot} />
              </View>

              <View style={[styles.statusBox, styles.statusInfo, { borderColor: '#BFDBFE' }]}>
                <View style={[styles.statusIconCircle, { backgroundColor: '#2563EB' }]}>
                  <MaterialIcons name="photo-camera" size={16} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.statusBoxTitle}>Capturing photo evidence...</Text>
                  <Text style={styles.statusBoxSub}>{Math.floor(activeSosDuration / 30)} capture(s) recorded</Text>
                </View>
                <View style={styles.livePulseDot} />
              </View>
            </ScrollView>

            <View style={styles.sosFooter}>
              <View style={styles.sosWarningCard}>
                <Text style={styles.sosWarningTitle}>Evidence Recording Active</Text>
                <Text style={styles.sosWarningText}>Audio and photos are being recorded every 30 seconds for your safety.</Text>
              </View>

              <Pressable style={styles.stopSosBtn} onPress={handleStopSos}>
                <Text style={styles.stopSosBtnText}>End Emergency & Save Evidence</Text>
              </Pressable>
            </View>
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
  statusMessage: {
    color: '#0F172A',
    fontSize: 12,
    textAlign: 'center',
  },
  smsWarning: {
    color: '#B45309',
    fontSize: 12,
    textAlign: 'center',
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
  durationBlock: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  durationLabel: {
    color: '#0F172A',
    fontSize: 12,
    fontWeight: '600',
  },
  durationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationButton: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#E2E8F0',
  },
  durationButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  durationValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
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
  historyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  historyRefresh: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  historyEmpty: {
    color: '#64748B',
    fontSize: 12,
  },
  historyRow: {
    gap: 4,
  },
  historyType: {
    fontWeight: '700',
    color: '#0F172A',
  },
  historyMeta: {
    color: '#64748B',
    fontSize: 12,
  },
  // Active SOS overlay (Figma Design)
  sosOverlay: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  sosContainer: {
    width: '100%',
    maxWidth: 420,
    flex: 1,
    gap: 16,
    paddingVertical: 20,
  },
  sosHeader: {
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
  },
  sosPulse: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 8,
    borderColor: '#FEF2F2',
  },
  sosAlertTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 6,
  },
  sosAlertSub: {
    color: '#94A3B8',
    fontSize: 14,
    textAlign: 'center',
  },
  sosTimerValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#F8FAFC',
    marginTop: 10,
  },
  sosStatusList: {
    gap: 12,
    paddingVertical: 10,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  statusSuccess: {
    backgroundColor: '#065F46',
    borderColor: '#047857',
  },
  statusInfo: {
    backgroundColor: '#1E293B',
    borderColor: '#334155',
  },
  statusIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBoxTitle: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  statusBoxSub: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  livePulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#EF4444',
  },
  sosFooter: {
    gap: 12,
  },
  sosWarningCard: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 4,
  },
  sosWarningTitle: {
    fontWeight: '700',
    color: '#F8FAFC',
    fontSize: 13,
  },
  sosWarningText: {
    color: '#94A3B8',
    fontSize: 12,
    lineHeight: 18,
  },
  stopSosBtn: {
    backgroundColor: '#EF4444',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopSosBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  contactSelectBlock: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  contactSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  contactSelectHint: {
    color: '#64748B',
    fontSize: 12,
  },
  contactSelectList: {
    gap: 8,
  },
  contactChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  contactChoiceSelected: {
    backgroundColor: '#F0FDF4',
    borderColor: '#16A34A',
  },
  contactChoiceName: {
    fontWeight: '600',
    color: '#0F172A',
    fontSize: 14,
  },
  contactChoiceMeta: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
  },
});
