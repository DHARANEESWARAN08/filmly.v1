import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme/colors';
import { signInWithPassword } from '../services/auth';
import { env } from '../config/env';

export function LoginScreen() {
  const { signIn } = useApp();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const googleConfigured = Boolean(env.googleAndroidClientId || env.googleWebClientId);
  const canUsePassword = username.trim().length > 1 && password.length >= 4;

  const handleGoogle = async () => {
    setError('');
    if (!googleConfigured) {
      setError('Google login is not configured. Use your username and password instead.');
      return;
    }

    setLoading(true);
    try {
      await signIn();
    } catch {
      setError('Google sign-in is unavailable. Use your username and password instead.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSignIn = async () => {
    if (!canUsePassword) return;
    setError('');
    setLoading(true);

    try {
      const user = await signInWithPassword(username, password);
      await signIn(user);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not sign in with that username.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=1000&q=80' }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient colors={['rgba(8,10,15,0.18)', 'rgba(8,10,15,0.82)', colors.background]} style={StyleSheet.absoluteFill} />
      </ImageBackground>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 22}
        style={styles.keyboard}
      >
        <ScrollView
          contentContainerStyle={styles.inner}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brandBlock}>
            <Image source={require('../../assets/filmly-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.panel}>
            <View style={styles.previewRow}>
              <Image source={require('../../assets/filmly-mark.png')} style={styles.loginMark} resizeMode="contain" />
              <View style={styles.previewCopy}>
                <Text style={styles.panelTitle}>Continue to Filmly</Text>
                <Text style={styles.panelSub}>
                  Create your own profile with a username and password.
                </Text>
              </View>
            </View>

            {loading ? (
              <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
            ) : (
              <>
                {googleConfigured ? (
                  <Pressable onPress={handleGoogle} style={styles.googleButton}>
                    <Ionicons name="logo-google" size={20} color={colors.background} />
                    <Text style={styles.googleButtonText}>Continue with Google</Text>
                  </Pressable>
                ) : null}

                <View style={styles.accountForm}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="Your name"
                    placeholderTextColor={colors.faint}
                    style={styles.input}
                    autoCapitalize="words"
                  />
                  <Text style={styles.inputLabel}>Password</Text>
                  <TextInput
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCorrect={false}
                    placeholder="At least 4 characters"
                    placeholderTextColor={colors.faint}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={handlePasswordSignIn}
                    disabled={!canUsePassword}
                    style={[styles.accountButton, !canUsePassword && styles.disabledButton]}
                  >
                    <Ionicons name="person-circle-outline" size={18} color={colors.background} />
                    <Text style={styles.accountButtonText}>Continue</Text>
                  </Pressable>
                </View>

                {error ? <Text style={styles.error}>{error}</Text> : null}
              </>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  inner: {
    flexGrow: 1,
    justifyContent: 'space-between',
    padding: spacing.page,
    paddingBottom: 34,
    paddingTop: 34,
  },
  brandBlock: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    height: 210,
    width: 210,
  },
  panel: {
    backgroundColor: 'rgba(16,19,26,0.94)',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  previewRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  loginMark: {
    height: 48,
    width: 48,
  },
  previewCopy: {
    flex: 1,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
  },
  panelSub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 3,
  },
  googleButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    minHeight: 50,
  },
  googleButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '900',
  },
  accountForm: {
    marginTop: 4,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 12,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  accountButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 16,
    minHeight: 48,
  },
  disabledButton: {
    opacity: 0.45,
  },
  accountButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  error: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 12,
    textAlign: 'center',
  },
  loader: {
    marginVertical: 28,
  },
});
