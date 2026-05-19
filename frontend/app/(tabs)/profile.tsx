import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';
import { useI18n, Language, CalendarType } from '@/lib/i18n';

type Tab = 'profile' | 'evidence';

type EvidenceItem = {
  evidence_id: string;
  alert_id: string;
  type: 'Audio' | 'Photo';
  file_path: string;
  timestamp: string;
};

type AlertWithEvidence = {
  alert_id: string;
  type: string;
  status: string;
  created_at: string;
  evidence: EvidenceItem[];
};

export default function ProfileScreen() {
  const { user, token, signOut } = useAuth();
  const { language, setLanguage, calendar, setCalendar, t } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [editMode, setEditMode] = useState(false);
  const [profile, setProfile] = useState({
    full_name: user?.full_name ?? 'SafeRoute User',
    email: user?.email ?? 'account@saferoute.app',
    phone_number: '',
  });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [settings, setSettings] = useState({
    notifications: true,
    locationSharing: true,
    emergencyAlerts: true,
    safetyReminders: false,
  });
  const [stats, setStats] = useState({ trips: 0, safeMiles: 0, alerts: 0, sosUsed: 0 });
  const [statsError, setStatsError] = useState<string | null>(null);
  const [alertsWithEvidence, setAlertsWithEvidence] = useState<AlertWithEvidence[]>([]);
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    authedApiFetch('/api/profile', token)
      .then((data) => {
        if (data) setProfile({ full_name: data.full_name ?? '', email: data.email ?? '', phone_number: data.phone_number ?? '' });
      })
      .catch((e: any) => setProfileError(e?.message || 'Unable to load profile'));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    Promise.all([authedApiFetch('/api/routes', token), authedApiFetch('/api/sos/history', token)])
      .then(([routes, alerts]) => {
        const routeList = Array.isArray(routes) ? routes : [];
        const alertList = Array.isArray(alerts) ? alerts : [];
        setStats({
          trips: routeList.length,
          safeMiles: Math.round(routeList.reduce((acc, r) => acc + (Number(r.distance) || 0), 0)),
          alerts: alertList.length,
          sosUsed: alertList.filter((a: any) => a.type === 'SOS').length,
        });
      })
      .catch((e: any) => setStatsError(e?.message || 'Unable to load stats'));
  }, [token]);

  useEffect(() => {
    if (!token || activeTab !== 'evidence') return;
    setEvidenceLoading(true);
    authedApiFetch('/api/sos/history', token)
      .then(async (alerts) => {
        const alertList = Array.isArray(alerts) ? alerts : [];
        const withEvidence = await Promise.all(
          alertList.map(async (alert: any) => {
            try {
              const ev = await authedApiFetch(`/api/sos/evidence/${alert.alert_id}`, token);
              return { ...alert, evidence: Array.isArray(ev) ? ev : [] };
            } catch {
              return { ...alert, evidence: [] };
            }
          })
        );
        setAlertsWithEvidence(withEvidence);
      })
      .catch(() => setAlertsWithEvidence([]))
      .finally(() => setEvidenceLoading(false));
  }, [token, activeTab]);

  const initials = useMemo(() => {
    const base = profile.full_name || user?.full_name || 'SR';
    return base.split(' ').filter(Boolean).map((n) => n[0]).join('').slice(0, 2).toUpperCase();
  }, [profile.full_name, user?.full_name]);

  const onSaveProfile = async () => {
    if (!token) return;
    setProfileSaving(true);
    setProfileError(null);
    try {
      const updated = await authedApiFetch('/api/profile', token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: profile.full_name.trim(), email: profile.email.trim(), phone_number: profile.phone_number.trim() }),
      });
      setProfile({ full_name: updated.full_name ?? profile.full_name, email: updated.email ?? profile.email, phone_number: updated.phone_number ?? profile.phone_number });
      setEditMode(false);
    } catch (e: any) {
      setProfileError(e?.message || 'Unable to update profile');
    } finally {
      setProfileSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return iso; }
  };

  const audioCount = (items: EvidenceItem[]) => items.filter((i) => i.type === 'Audio').length;
  const photoCount = (items: EvidenceItem[]) => items.filter((i) => i.type === 'Photo').length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      {/* Tabs */}
      <View style={styles.tabBar}>
        <Pressable style={[styles.tab, activeTab === 'profile' && styles.tabActive]} onPress={() => setActiveTab('profile')}>
          <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
        </Pressable>
        <Pressable style={[styles.tab, activeTab === 'evidence' && styles.tabActive]} onPress={() => setActiveTab('evidence')}>
          <View style={styles.tabRow}>
            <Text style={[styles.tabText, activeTab === 'evidence' && styles.tabTextActive]}>Alert Evidence</Text>
            {stats.sosUsed > 0 && (
              <View style={styles.badge}><Text style={styles.badgeText}>{stats.sosUsed}</Text></View>
            )}
          </View>
        </Pressable>
      </View>

      {activeTab === 'profile' ? (
        <>
          {/* Profile Header */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>
            <Text style={styles.name}>{profile.full_name || user?.full_name || 'SafeRoute User'}</Text>
            <Text style={styles.email}>{profile.email || user?.email || 'account@saferoute.app'}</Text>
            <Pressable style={styles.outlineButton} onPress={() => setEditMode((v) => !v)}>
              <Text style={styles.outlineButtonText}>{editMode ? 'Close Edit' : 'Edit Profile'}</Text>
            </Pressable>
            {profileError ? <Text style={styles.errorText}>{profileError}</Text> : null}
          </View>

          {/* Personal Info */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Personal Information</Text>
            {editMode ? (
              <View style={styles.formBlock}>
                {[
                  { icon: 'person', key: 'full_name', placeholder: 'Full name', type: 'default' },
                  { icon: 'mail', key: 'email', placeholder: 'Email', type: 'email-address' },
                  { icon: 'call', key: 'phone_number', placeholder: 'Phone (+251...)', type: 'phone-pad' },
                ].map(({ icon, key, placeholder, type }) => (
                  <View key={key} style={styles.inputRow}>
                    <MaterialIcons name={icon as any} size={18} color="#94A3B8" />
                    <TextInput
                      style={styles.input}
                      placeholder={placeholder}
                      keyboardType={type as any}
                      autoCapitalize="none"
                      value={(profile as any)[key]}
                      onChangeText={(v) => setProfile((prev) => ({ ...prev, [key]: v }))}
                    />
                  </View>
                ))}
                <Pressable style={[styles.primaryButton, profileSaving && styles.buttonDisabled]} onPress={onSaveProfile} disabled={profileSaving}>
                  <Text style={styles.primaryButtonText}>{profileSaving ? 'Saving...' : 'Save Profile'}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {[
                  { icon: 'person', value: profile.full_name || user?.full_name || 'SafeRoute User' },
                  { icon: 'mail', value: profile.email || user?.email || 'account@saferoute.app' },
                  { icon: 'call', value: profile.phone_number || '—' },
                  { icon: 'place', value: 'Addis Ababa, AA' },
                ].map(({ icon, value }) => (
                  <View key={icon} style={styles.infoRow}>
                    <MaterialIcons name={icon as any} size={18} color="#94A3B8" />
                    <Text style={styles.infoText}>{value}</Text>
                  </View>
                ))}
              </>
            )}
          </View>

          {/* Safety Settings */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Safety Settings</Text>
            {[
              { icon: 'notifications', color: '#7C3AED', title: 'Push Notifications', sub: 'Receive safety alerts', key: 'notifications' },
              { icon: 'map', color: '#16A34A', title: 'Location Services', sub: 'Share your location', key: 'locationSharing' },
              { icon: 'security', color: '#DC2626', title: 'Emergency Alerts', sub: 'Critical safety warnings', key: 'emergencyAlerts' },
              { icon: 'lightbulb', color: '#F97316', title: 'Safety Reminders', sub: 'Periodic safety tips', key: 'safetyReminders' },
            ].map(({ icon, color, title, sub, key }) => (
              <View key={key} style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <MaterialIcons name={icon as any} size={20} color={color} />
                  <View><Text style={styles.settingTitle}>{title}</Text><Text style={styles.settingSub}>{sub}</Text></View>
                </View>
                <Switch value={(settings as any)[key]} onValueChange={(v) => setSettings((prev) => ({ ...prev, [key]: v }))} />
              </View>
            ))}
          </View>

          {/* Localization */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Localization Preferences</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MaterialIcons name="language" size={20} color="#0D9488" />
                <View><Text style={styles.settingTitle}>Language / ቋንቋ</Text><Text style={styles.settingSub}>{language === 'en' ? 'English' : 'አማርኛ'}</Text></View>
              </View>
              <Switch value={language === 'am'} onValueChange={(val) => setLanguage(val ? 'am' : 'en')} />
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <MaterialIcons name="event" size={20} color="#0D9488" />
                <View><Text style={styles.settingTitle}>Calendar</Text><Text style={styles.settingSub}>{calendar === 'gregorian' ? 'Gregorian (GC)' : 'Ethiopian (EC)'}</Text></View>
              </View>
              <Switch value={calendar === 'ethiopian'} onValueChange={(val) => setCalendar(val ? 'ethiopian' : 'gregorian')} />
            </View>
          </View>

          {/* Stats */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Your Safety Stats</Text>
            <View style={styles.statsGrid}>
              {[
                { label: 'Trips Tracked', value: stats.trips, color: '#7C3AED' },
                { label: 'Safe Miles', value: stats.safeMiles, color: '#16A34A' },
                { label: 'Alerts', value: stats.alerts, color: '#7C3AED' },
                { label: 'SOS Used', value: stats.sosUsed, color: '#DC2626' },
              ].map(({ label, value, color }) => (
                <View key={label} style={styles.stat}>
                  <Text style={[styles.statValue, { color }]}>{value}</Text>
                  <Text style={styles.statLabel}>{label}</Text>
                </View>
              ))}
            </View>
            {statsError ? <Text style={styles.errorText}>{statsError}</Text> : null}
          </View>

          {/* Account */}
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
        </>
      ) : (
        <>
          {/* Evidence Tab */}
          <View style={styles.evidenceHeader}>
            <Text style={styles.evidenceTitle}>Previous Alert Evidence</Text>
            <Text style={styles.evidenceSub}>Audio and photo evidence from your emergency alerts</Text>
          </View>

          {evidenceLoading ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="hourglass-empty" size={40} color="#94A3B8" />
              <Text style={styles.emptyText}>Loading evidence...</Text>
            </View>
          ) : alertsWithEvidence.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialIcons name="shield" size={48} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No Evidence Recorded</Text>
              <Text style={styles.emptyText}>Evidence will be automatically recorded when you trigger an SOS alert.</Text>
            </View>
          ) : (
            alertsWithEvidence.map((alert) => (
              <View key={alert.alert_id} style={styles.evidenceCard}>
                {/* Alert Header */}
                <Pressable style={styles.evidenceCardHeader} onPress={() => setExpandedAlert(expandedAlert === alert.alert_id ? null : alert.alert_id)}>
                  <View style={styles.evidenceAlertLeft}>
                    <View style={styles.sosIconWrap}>
                      <MaterialIcons name="warning" size={18} color="#DC2626" />
                    </View>
                    <View>
                      <Text style={styles.evidenceAlertType}>{alert.type} Alert</Text>
                      <Text style={styles.evidenceAlertMeta}>{formatDate(alert.created_at)}</Text>
                    </View>
                  </View>
                  <View style={styles.evidenceRightRow}>
                    <View style={[styles.statusPill, alert.status === 'Resolved' ? styles.statusResolved : styles.statusActive]}>
                      <Text style={styles.statusText}>{alert.status}</Text>
                    </View>
                    <MaterialIcons name={expandedAlert === alert.alert_id ? 'expand-less' : 'expand-more'} size={20} color="#64748B" />
                  </View>
                </Pressable>

                {/* Evidence counts summary */}
                <View style={styles.evidenceSummaryRow}>
                  <View style={styles.evidenceCountChip}>
                    <MaterialIcons name="mic" size={14} color="#7C3AED" />
                    <Text style={styles.evidenceCountText}>{audioCount(alert.evidence)} Audio</Text>
                  </View>
                  <View style={styles.evidenceCountChip}>
                    <MaterialIcons name="photo-camera" size={14} color="#2563EB" />
                    <Text style={styles.evidenceCountText}>{photoCount(alert.evidence)} Photo</Text>
                  </View>
                </View>

                {/* Expanded evidence list */}
                {expandedAlert === alert.alert_id && (
                  <View style={styles.evidenceList}>
                    <View style={styles.divider} />
                    {alert.evidence.length === 0 ? (
                      <Text style={styles.noEvidenceText}>No evidence files captured for this alert.</Text>
                    ) : (
                      alert.evidence.map((item, idx) => (
                        <View key={item.evidence_id} style={[styles.evidenceItemCard, item.type === 'Audio' ? styles.evidenceItemAudio : styles.evidenceItemPhoto]}>
                          <View style={styles.evidenceItemHeader}>
                            <MaterialIcons name={item.type === 'Audio' ? 'mic' : 'photo-camera'} size={18} color={item.type === 'Audio' ? '#7C3AED' : '#2563EB'} />
                            <Text style={styles.evidenceItemLabel}>{item.type} {idx + 1}</Text>
                          </View>
                          <Pressable style={styles.evidencePlayBtn}>
                            <MaterialIcons name={item.type === 'Audio' ? 'play-arrow' : 'image'} size={14} color="#475569" />
                            <Text style={styles.evidencePlayText}>{item.type === 'Audio' ? 'Play' : 'View'}</Text>
                          </Pressable>
                          <Text style={styles.evidenceTimestamp}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                        </View>
                      ))
                    )}

                    <View style={styles.evidenceActions}>
                      <Pressable style={styles.evidenceActionBtn}>
                        <MaterialIcons name="download" size={14} color="#475569" />
                        <Text style={styles.evidenceActionText}>Download All</Text>
                      </Pressable>
                      <Pressable style={styles.evidenceActionBtn}>
                        <MaterialIcons name="share" size={14} color="#475569" />
                        <Text style={styles.evidenceActionText}>Share</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}

          {/* Info card */}
          <View style={styles.infoCard}>
            <Text style={styles.infoCardTitle}>About Evidence Recording</Text>
            {[
              'Audio is recorded every 30 seconds during SOS',
              'Photos are captured every 30 seconds',
              'All evidence is securely stored on our servers',
              'Evidence can be shared with authorities',
            ].map((line) => (
              <Text key={line} style={styles.infoCardLine}>• {line}</Text>
            ))}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, paddingBottom: 40, gap: 16, backgroundColor: '#F8FAFC', maxWidth: 420, alignSelf: 'center', width: '100%' },
  tabBar: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 14, padding: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#7C3AED' },
  tabText: { fontWeight: '600', color: '#64748B', fontSize: 13 },
  tabTextActive: { color: '#FFFFFF' },
  tabRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  badge: { backgroundColor: '#DC2626', borderRadius: 99, width: 18, height: 18, alignItems: 'center', justifyContent: 'center' },
  badgeText: { color: '#FFFFFF', fontSize: 10, fontWeight: '700' },
  profileCard: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#E2E8F0' },
  avatar: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#C084FC', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFFFFF', fontSize: 28, fontWeight: '700' },
  name: { fontSize: 20, fontWeight: '700', color: '#0F172A' },
  email: { color: '#64748B' },
  outlineButton: { marginTop: 6, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: '#E2E8F0' },
  outlineButtonText: { color: '#0F172A', fontWeight: '600' },
  errorText: { color: '#DC2626', fontSize: 12 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16, gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#0F172A' },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  infoText: { color: '#475569' },
  formBlock: { gap: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#F8FAFC' },
  input: { flex: 1 },
  primaryButton: { alignItems: 'center', paddingVertical: 12, borderRadius: 12, backgroundColor: '#7C3AED' },
  primaryButtonText: { color: '#FFFFFF', fontWeight: '600' },
  buttonDisabled: { opacity: 0.6 },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingTitle: { color: '#0F172A', fontWeight: '600' },
  settingSub: { color: '#94A3B8', fontSize: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47%', alignItems: 'center', paddingVertical: 12, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 12, color: '#64748B', marginTop: 4 },
  outlineButtonRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  outlineButtonRowText: { color: '#0F172A', fontWeight: '600' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: '#FECACA', backgroundColor: '#FEF2F2' },
  logoutText: { color: '#DC2626', fontWeight: '600' },
  // Evidence tab
  evidenceHeader: { gap: 4 },
  evidenceTitle: { fontSize: 18, fontWeight: '700', color: '#0F172A' },
  evidenceSub: { fontSize: 13, color: '#64748B' },
  emptyCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 32, alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#0F172A' },
  emptyText: { color: '#64748B', fontSize: 13, textAlign: 'center' },
  evidenceCard: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: '#E2E8F0' },
  evidenceCardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  evidenceAlertLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sosIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FEF2F2', alignItems: 'center', justifyContent: 'center' },
  evidenceAlertType: { fontWeight: '700', color: '#0F172A', fontSize: 14 },
  evidenceAlertMeta: { color: '#64748B', fontSize: 12, marginTop: 2 },
  evidenceRightRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusPill: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 3 },
  statusResolved: { backgroundColor: '#DCFCE7' },
  statusActive: { backgroundColor: '#FEF2F2' },
  statusText: { fontSize: 11, fontWeight: '600', color: '#0F172A' },
  evidenceSummaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 14, paddingBottom: 12 },
  evidenceCountChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F8FAFC', borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: '#E2E8F0' },
  evidenceCountText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginBottom: 12 },
  evidenceList: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  noEvidenceText: { color: '#94A3B8', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  evidenceItemCard: { borderRadius: 12, padding: 12, gap: 6, borderWidth: 1 },
  evidenceItemAudio: { backgroundColor: '#FAF5FF', borderColor: '#E9D5FF' },
  evidenceItemPhoto: { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' },
  evidenceItemHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  evidenceItemLabel: { fontWeight: '600', color: '#0F172A', fontSize: 13 },
  evidencePlayBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFFFFF', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: '#E2E8F0', alignSelf: 'flex-start' },
  evidencePlayText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  evidenceTimestamp: { fontSize: 11, color: '#94A3B8' },
  evidenceActions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  evidenceActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  evidenceActionText: { fontSize: 13, color: '#475569', fontWeight: '500' },
  infoCard: { backgroundColor: '#EFF6FF', borderRadius: 14, padding: 14, gap: 6, borderWidth: 1, borderColor: '#BFDBFE' },
  infoCardTitle: { fontWeight: '700', color: '#1E3A5F', fontSize: 14 },
  infoCardLine: { fontSize: 13, color: '#1E40AF' },
});
