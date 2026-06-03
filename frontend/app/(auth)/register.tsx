import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth';
import { apiFetch } from '@/lib/api';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';

// Password strength validator
const validatePasswordStrength = (pwd: string) => {
  const checks = {
    length: pwd.length >= 8,
    hasUppercase: /[A-Z]/.test(pwd),
    hasLowercase: /[a-z]/.test(pwd),
    hasNumber: /\d/.test(pwd),
    hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
  };

  const passedChecks = Object.values(checks).filter(Boolean).length;
  let strength = 'weak';
  let color = '#DC2626';

  if (passedChecks >= 4) {
    strength = 'strong';
    color = '#16A34A';
  } else if (passedChecks >= 3) {
    strength = 'medium';
    color = '#F59E0B';
  }

  return {
    strength,
    color,
    checks,
    passedChecks,
    isValid: passedChecks >= 3, // Require at least 3 checks
  };
};

export default function RegisterScreen() {
  const router = useRouter();
  const { signUp, token } = useAuth();

  const [fullName, setFullName] = useState('Test User');
  const [email, setEmail] = useState('test@example.com');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('test123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(validatePasswordStrength(''));

  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (token) router.replace('/(tabs)');
  }, [token, router]);

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    setPasswordStrength(validatePasswordStrength(pwd));
  };

  const onSendOtp = async () => {
    setError(null);

    // Check password strength
    if (!passwordStrength.isValid) {
      setError('Password must be at least 8 characters with uppercase, lowercase, number, or special character');
      return;
    }

    setSubmitting(true);
    try {
      if (phoneNumber.trim()) {
        await apiFetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone_number: phoneNumber.trim() }),
        });
        setStep('otp');
      } else {
        // Fallback to normal sign up if no phone
        await signUp(fullName.trim(), email.trim(), password, undefined);
        router.replace('/(tabs)');
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to send OTP');
    } finally {
      setSubmitting(false);
    }
  };

  const onVerifyOtpAndRegister = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone_number: phoneNumber.trim(), otp: otp.trim() }),
      });

      await signUp(fullName.trim(), email.trim(), password, phoneNumber.trim());
      
      // Request permissions after successful signup
      await requestPermissionsAfterSignup();
      
      router.replace('/(tabs)');
    } catch (e: any) {
      setError(e?.message ?? 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  };

  const requestPermissionsAfterSignup = async () => {
    try {
      // Request location permission
      await Location.requestForegroundPermissionsAsync();
      
      // Request camera permission
      await Camera.requestCameraPermissionsAsync();
      
      // Request microphone permission
      await Audio.requestPermissionsAsync();
      
      console.log('[RegisterScreen] All permissions requested after signup');
    } catch (err) {
      console.warn('[RegisterScreen] Error requesting permissions:', err);
      // Don't fail signup if permission requests fail
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
          <Text style={styles.brandText}>Create Account</Text>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={styles.title}>Join SafeRoute</Text>
        <Text style={styles.subtitle}>Set up your account and your safety circle.</Text>
      </View>

      <View style={styles.form}>
        {step === 'details' ? (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Full name</Text>
              <TextInput value={fullName} onChangeText={setFullName} placeholderTextColor="#94A3B8" style={[styles.input, { color: '#0F172A' }]} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholderTextColor="#94A3B8"
                style={[styles.input, { color: '#0F172A' }]}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone (required for OTP)</Text>
              <TextInput placeholder="+251..." value={phoneNumber} onChangeText={setPhoneNumber} keyboardType="phone-pad" placeholderTextColor="#94A3B8" style={[styles.input, { color: '#0F172A' }]} />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <TextInput 
                value={password} 
                onChangeText={handlePasswordChange} 
                secureTextEntry 
                placeholderTextColor="#94A3B8" 
                style={[styles.input, { color: '#0F172A' }]} 
              />
              
              {/* Password Strength Indicator */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthBar}>
                    <View
                      style={[
                        styles.strengthFill,
                        {
                          width: `${(passwordStrength.passedChecks / 5) * 100}%`,
                          backgroundColor: passwordStrength.color,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.strengthText, { color: passwordStrength.color }]}>
                    Strength: {passwordStrength.strength}
                  </Text>
                </View>
              )}

              {/* Requirements Checklist */}
              {password.length > 0 && (
                <View style={styles.requirementsContainer}>
                  <View style={styles.requirementRow}>
                    <MaterialIcons
                      name={passwordStrength.checks.length ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                      color={passwordStrength.checks.length ? '#16A34A' : '#CBD5E1'}
                    />
                    <Text style={styles.requirementText}>At least 8 characters</Text>
                  </View>
                  <View style={styles.requirementRow}>
                    <MaterialIcons
                      name={passwordStrength.checks.hasUppercase ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                      color={passwordStrength.checks.hasUppercase ? '#16A34A' : '#CBD5E1'}
                    />
                    <Text style={styles.requirementText}>Uppercase letter (A-Z)</Text>
                  </View>
                  <View style={styles.requirementRow}>
                    <MaterialIcons
                      name={passwordStrength.checks.hasLowercase ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                      color={passwordStrength.checks.hasLowercase ? '#16A34A' : '#CBD5E1'}
                    />
                    <Text style={styles.requirementText}>Lowercase letter (a-z)</Text>
                  </View>
                  <View style={styles.requirementRow}>
                    <MaterialIcons
                      name={passwordStrength.checks.hasNumber ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                      color={passwordStrength.checks.hasNumber ? '#16A34A' : '#CBD5E1'}
                    />
                    <Text style={styles.requirementText}>Number (0-9)</Text>
                  </View>
                  <View style={styles.requirementRow}>
                    <MaterialIcons
                      name={passwordStrength.checks.hasSpecialChar ? 'check-circle' : 'radio-button-unchecked'}
                      size={16}
                      color={passwordStrength.checks.hasSpecialChar ? '#16A34A' : '#CBD5E1'}
                    />
                    <Text style={styles.requirementText}>Special character (!@#$%^&* etc.)</Text>
                  </View>
                </View>
              )}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={onSendOtp}
              disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? 'Please wait...' : 'Continue'}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.field}>
              <Text style={styles.label}>Enter 6-digit OTP</Text>
              <TextInput value={otp} onChangeText={setOtp} keyboardType="number-pad" maxLength={6} placeholderTextColor="#94A3B8" style={[styles.input, { color: '#0F172A' }]} />
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.primaryButton, submitting && styles.buttonDisabled]}
              onPress={onVerifyOtpAndRegister}
              disabled={submitting}>
              <Text style={styles.primaryButtonText}>{submitting ? 'Verifying...' : 'Verify & Create Account'}</Text>
            </Pressable>
            <Pressable onPress={() => setStep('details')} style={{ marginTop: 10 }}>
              <Text style={styles.footerText}>Back to details</Text>
            </Pressable>
          </>
        )}
      </View>

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={styles.linkText} onPress={() => router.push('/(auth)/login')}>
          Login
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
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    color: '#0F172A',
  },
  strengthContainer: {
    marginTop: 10,
    gap: 6,
  },
  strengthBar: {
    height: 8,
    borderRadius: 999,
    backgroundColor: '#E2E8F0',
    overflow: 'hidden',
  },
  strengthFill: {
    height: '100%',
    borderRadius: 999,
  },
  strengthText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  requirementsContainer: {
    marginTop: 10,
    gap: 6,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requirementText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
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
  linkText: {
    color: '#7C3AED',
    fontWeight: '600',
  },
});

