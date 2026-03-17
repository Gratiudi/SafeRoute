import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Link, useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, token } = useAuth();

  const [fullName, setFullName] = useState('Test User');
  const [email, setEmail] = useState('test@example.com');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('test123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) router.replace('/(tabs)');
  }, [token, router]);

  const onRegister = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signUp(fullName.trim(), email.trim(), password, phoneNumber.trim() || undefined);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.topBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={20} color="#0F172A" />
        </Pressable>
        <View style={styles.brand}>
          <View style={styles.brandIcon}>
            <MaterialIcons name="security" size={16} color="#FFFFFF" />
          </View>
          <Text style={styles.brandText}>Create Account</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Join SafeRoute</Text>
        <Text style={styles.subtitle}>Set up your account and your safety circle.</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Full name</Text>
          <TextInput value={fullName} onChangeText={setFullName} style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Phone (optional)</Text>
          <TextInput value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" style={styles.input} />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={onRegister}
          disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Creating...' : 'Create Account'}</Text>
        </Pressable>
      </View>

      <Text style={styles.footerText}>
        Already have an account? <Link href="/(auth)/login">Sign in</Link>
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    gap: 24,
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#7C3AED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
  },
  header: {
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    textAlign: 'center',
    color: '#475569',
  },
  form: {
    gap: 16,
  },
  field: { gap: 6 },
  label: {
    color: '#475569',
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
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
  buttonDisabled: { opacity: 0.6 },
  error: { color: '#DC2626' },
  footerText: {
    textAlign: 'center',
    color: '#475569',
  },
});

