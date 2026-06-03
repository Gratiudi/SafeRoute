import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn, token } = useAuth();

  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('test123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (token) router.replace('/(tabs)');
  }, [token, router]);

  const onSendOtp = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Login failed');
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
            <Image
              source={require('../../assets/images/logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandText}>Login</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue protecting your journey</Text>
      </View>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Email Address or Phone (+...)</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="email@example.com or +251..."
            placeholderTextColor="#94A3B8"
            style={[styles.input, { color: '#0F172A' }]}
          />
        </View>

        <View style={styles.field}>
          <View style={styles.passwordRow}>
            <Text style={styles.label}>Password</Text>
          </View>
          <TextInput value={password} onChangeText={setPassword} secureTextEntry placeholderTextColor="#94A3B8" style={[styles.input, { color: '#0F172A' }]} />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          style={[styles.primaryButton, submitting && styles.buttonDisabled]}
          onPress={onSendOtp}
          disabled={submitting}>
          <Text style={styles.primaryButtonText}>{submitting ? 'Please wait...' : 'Login'}</Text>
        </Pressable>
      </View>

      <View style={styles.demoCard}>
        <Text style={styles.demoText}>
          <Text style={styles.demoStrong}>Demo:</Text> Create an account first, or use any previously created
          credentials
        </Text>
      </View>

      <Text style={styles.footerText}>
        Don&apos;t have an account?{' '}
        <Text style={styles.linkText} onPress={() => router.push('/(auth)/register')}>
          Create Account
        </Text>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 28,
    height: 28,
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
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  forgotText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
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
  demoCard: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F5F3FF',
  },
  demoText: {
    color: '#475569',
    fontSize: 12,
    textAlign: 'center',
  },
  demoStrong: {
    fontWeight: '700',
    color: '#6D28D9',
  },
  footerText: {
    textAlign: 'center',
    color: '#475569',
  },
  linkText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});

