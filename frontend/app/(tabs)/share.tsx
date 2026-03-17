import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

type Contact = {
  id: number;
  name: string;
  email: string;
  isSharing: boolean;
  lastUpdate?: string;
};

const initialContacts: Contact[] = [
  { id: 1, name: 'Mom', email: 'mom@example.com', isSharing: false },
  { id: 2, name: 'Dad', email: 'dad@example.com', isSharing: false },
  { id: 3, name: 'Sarah (Best Friend)', email: 'sarah@example.com', isSharing: true, lastUpdate: '2 min ago' },
  { id: 4, name: 'Emergency Contact', email: 'emergency@example.com', isSharing: false },
];

export default function ShareScreen() {
  const [isLiveSharing, setIsLiveSharing] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>(initialContacts);

  const toggleContactSharing = (contactId: number) => {
    setContacts((prev) =>
      prev.map((contact) =>
        contact.id === contactId
          ? { ...contact, isSharing: !contact.isSharing, lastUpdate: contact.isSharing ? undefined : 'Just now' }
          : contact
      )
    );
  };

  const activeShares = contacts.filter((c) => c.isSharing).length;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Location Sharing</Text>
        <Text style={styles.subtitle}>Share your real-time location with trusted contacts</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={styles.row}>
            <View style={[styles.iconCircle, isLiveSharing ? styles.iconActive : styles.iconInactive]}>
              <MaterialIcons name="share" size={18} color={isLiveSharing ? '#16A34A' : '#64748B'} />
            </View>
            <View>
              <Text style={styles.rowTitle}>Live Location Sharing</Text>
              <Text style={styles.rowSub}>{isLiveSharing ? 'Active' : 'Inactive'}</Text>
            </View>
          </View>
          <Switch value={isLiveSharing} onValueChange={setIsLiveSharing} />
        </View>
        {isLiveSharing ? (
          <View style={styles.activeBanner}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>
              Sharing location with {activeShares} contact{activeShares !== 1 ? 's' : ''}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <MaterialIcons name="place" size={18} color="#7C3AED" />
          <View>
            <Text style={styles.rowTitle}>Current Location</Text>
            <Text style={styles.rowSub}>123 Main Street, Downtown</Text>
            <Text style={styles.rowMeta}>Last updated: Just now</Text>
          </View>
        </View>
      </View>

      <View style={styles.contactsHeader}>
        <Text style={styles.sectionTitle}>Share with Contacts</Text>
        <View style={styles.badge}>
          <MaterialIcons name="people" size={12} color="#7C3AED" />
          <Text style={styles.badgeText}>{activeShares} active</Text>
        </View>
      </View>

      <View style={styles.contactList}>
        {contacts.map((contact) => (
          <View key={contact.id} style={styles.contactCard}>
            <View style={styles.rowBetween}>
              <View style={styles.row}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{contact.name.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.rowTitle}>{contact.name}</Text>
                  <Text style={styles.rowSub}>{contact.email}</Text>
                  {contact.isSharing && contact.lastUpdate ? (
                    <View style={styles.rowMetaLine}>
                      <MaterialIcons name="schedule" size={12} color="#16A34A" />
                      <Text style={styles.sharedText}>Shared {contact.lastUpdate}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <Pressable
                style={[styles.shareButton, contact.isSharing && styles.shareButtonDanger]}
                onPress={() => toggleContactSharing(contact.id)}
                disabled={!isLiveSharing}>
                <MaterialIcons name={contact.isSharing ? 'close' : 'share'} size={14} color="#FFFFFF" />
                <Text style={styles.shareButtonText}>{contact.isSharing ? 'Stop' : 'Share'}</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.cardTitle}>Quick Share Options</Text>
        <Pressable style={styles.optionRow}>
          <MaterialIcons name="schedule" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>Share for 1 hour</Text>
        </Pressable>
        <Pressable style={styles.optionRow}>
          <MaterialIcons name="schedule" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>Share until I arrive</Text>
        </Pressable>
        <Pressable style={styles.optionRow}>
          <MaterialIcons name="link" size={16} color="#7C3AED" />
          <Text style={styles.optionText}>Share via link</Text>
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
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowTitle: {
    fontWeight: '600',
    color: '#0F172A',
  },
  rowSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  rowMeta: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 2,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconActive: {
    backgroundColor: '#DCFCE7',
  },
  iconInactive: {
    backgroundColor: '#E2E8F0',
  },
  activeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16A34A',
  },
  activeText: {
    color: '#16A34A',
    fontSize: 12,
  },
  contactsHeader: {
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
    borderColor: '#DDD6FE',
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: 8,
  },
  badgeText: {
    color: '#7C3AED',
    fontSize: 12,
    fontWeight: '600',
  },
  contactList: {
    gap: 12,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E9D5FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#7C3AED',
    fontWeight: '700',
  },
  rowMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  sharedText: {
    color: '#16A34A',
    fontSize: 11,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#7C3AED',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  shareButtonDanger: {
    backgroundColor: '#DC2626',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 12,
  },
  infoCard: {
    backgroundColor: '#F5F3FF',
    borderRadius: 16,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  cardTitle: {
    fontWeight: '600',
    color: '#0F172A',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  optionText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});

