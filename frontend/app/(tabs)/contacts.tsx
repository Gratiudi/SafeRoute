import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useAuth } from '@/lib/auth';
import { authedApiFetch } from '@/lib/api';

type EmergencyContact = {
  contact_id: string;
  name: string;
  phone_number: string;
  relationship: string | null;
};

export default function ContactsScreen() {
  const { token } = useAuth();
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('');

  const loadContacts = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const data = await authedApiFetch('/api/emergency-contacts', token);
      setContacts(data ?? []);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setRelationship('');
    setEditingId(null);
  };

  const startEdit = (contact: EmergencyContact) => {
    setEditingId(contact.contact_id);
    setName(contact.name);
    setPhone(contact.phone_number);
    setRelationship(contact.relationship ?? '');
  };

  const onSave = async () => {
    if (!token) return;
    if (!name.trim() || !phone.trim()) {
      Alert.alert('Missing info', 'Name and phone are required');
      return;
    }
    try {
      setSaving(true);
      if (editingId) {
        const updated = await authedApiFetch(`/api/emergency-contacts/${editingId}`, token, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone_number: phone.trim(),
            relationship: relationship.trim() || null,
          }),
        });
        setContacts((prev) =>
          prev.map((c) => (c.contact_id === editingId ? updated : c))
        );
      } else {
        const newContact = await authedApiFetch('/api/emergency-contacts', token, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            phone_number: phone.trim(),
            relationship: relationship.trim() || undefined,
          }),
        });
        setContacts((prev) => [...prev, newContact]);
      }
      resetForm();
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'Failed to save contact');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!token) return;
    try {
      await authedApiFetch(`/api/emergency-contacts/${id}`, token, {
        method: 'DELETE',
      });
      setContacts((prev) => prev.filter((c) => c.contact_id !== id));
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.message ?? 'Failed to delete contact');
    }
  };

  return (
    <FlatList
      data={contacts}
      keyExtractor={(item) => String(item.contact_id)}
      refreshing={loading}
      onRefresh={loadContacts}
      ListHeaderComponent={
        <View style={styles.headerWrapper}>
          <View>
            <Text style={styles.pageTitle}>Emergency Contacts</Text>
            <Text style={styles.pageSubtitle}>Manage your trusted emergency contacts</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Add contact</Text>
            <TextInput placeholder="Name" value={name} onChangeText={setName} style={styles.input} />
            <TextInput
              placeholder="Phone"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              style={styles.input}
            />
            <TextInput
              placeholder="Relationship (optional)"
              value={relationship}
              onChangeText={setRelationship}
              style={styles.input}
            />
            <View style={styles.formActions}>
              {editingId ? (
                <Pressable style={styles.ghostButton} onPress={resetForm} disabled={saving}>
                  <Text style={styles.ghostButtonText}>Cancel</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={[styles.primaryButton, saving && styles.buttonDisabled]}
                onPress={onSave}
                disabled={saving}>
                <Text style={styles.primaryButtonText}>
                  {saving ? 'Saving...' : editingId ? 'Update contact' : 'Save contact'}
                </Text>
              </Pressable>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Your contacts</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.contactRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1, gap: 6 }}>
            <View style={styles.contactHeader}>
              <View>
                <Text style={styles.contactName}>{item.name}</Text>
                {item.relationship ? <Text style={styles.contactMeta}>{item.relationship}</Text> : null}
              </View>
              <View style={styles.rowActions}>
                <Pressable onPress={() => startEdit(item)} style={styles.editButton}>
                  <MaterialIcons name="edit" size={16} color="#0F172A" />
                </Pressable>
                <Pressable onPress={() => onDelete(item.contact_id)} style={styles.deleteButton}>
                  <MaterialIcons name="close" size={16} color="#DC2626" />
                </Pressable>
              </View>
            </View>
            <View style={styles.contactLine}>
              <MaterialIcons name="call" size={16} color="#94A3B8" />
              <Text style={styles.contactMeta}>{item.phone_number}</Text>
            </View>
            <View style={styles.contactActions}>
              <Pressable style={styles.actionPill}>
                <MaterialIcons name="call" size={14} color="#FFFFFF" />
                <Text style={styles.actionPillText}>Call</Text>
              </Pressable>
              <Pressable style={styles.actionPillOutline}>
                <MaterialIcons name="message" size={14} color="#7C3AED" />
                <Text style={styles.actionPillOutlineText}>Message</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      ListEmptyComponent={
        !loading ? <Text style={styles.emptyText}>No contacts yet. Add one above.</Text> : null
      }
      contentContainerStyle={styles.listContainer}
      ListFooterComponent={
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Tips for Emergency Contacts</Text>
          <View style={styles.infoList}>
            <Text style={styles.infoItem}>• Add at least 3 trusted contacts</Text>
            <Text style={styles.infoItem}>• Include family members and close friends</Text>
            <Text style={styles.infoItem}>• Keep contact information up to date</Text>
            <Text style={styles.infoItem}>• Test emergency alerts regularly</Text>
          </View>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: '#F8FAFC',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  headerWrapper: {
    gap: 16,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  pageSubtitle: {
    color: '#64748B',
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
    marginTop: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
  },
  primaryButton: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#7C3AED',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  ghostButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  ghostButtonText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  buttonDisabled: { opacity: 0.6 },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#6D28D9',
    fontWeight: '700',
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  contactMeta: {
    color: '#64748B',
  },
  contactLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: '#7C3AED',
  },
  actionPillText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  actionPillOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  actionPillOutlineText: {
    color: '#7C3AED',
    fontWeight: '600',
    fontSize: 12,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  editButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E2E8F0',
  },
  rowActions: {
    flexDirection: 'row',
    gap: 6,
  },
  emptyText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#DDD6FE',
    marginTop: 10,
  },
  infoTitle: {
    fontWeight: '600',
    color: '#0F172A',
    marginBottom: 8,
  },
  infoList: {
    gap: 4,
  },
  infoItem: {
    color: '#64748B',
    fontSize: 12,
  },
});

