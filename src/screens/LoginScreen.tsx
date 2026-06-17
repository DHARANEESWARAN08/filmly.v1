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

import { useAuth } from '../hooks/useAuth';
import { colors, spacing } from '../theme/colors';

export function LoginScreen() {
  const { signIn, signUp, resendConfirmation, authNotice, clearAuthNotice } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const isValidEmail = email.trim().includes('@');
  const canSubmit = isSignUp
    ? isValidEmail && username.trim().length > 1 && password.length >= 6
    : isValidEmail && password.length >= 6;
  const activeNotice = notice || authNotice?.message || '';
  const noticeTone = notice ? 'info' : authNotice?.tone || 'info';

  const resetMessages = () => {
    setError('');
    setNotice('');
    clearAuthNotice();
  };

  const handleSubmit = async () => {
    if (!canSubmit || loading) return;
    resetMessages();
    setLoading(true);

    try {
      if (isSignUp) {
        const result = await signUp(email, password, username);
        setNotice(result.message);
        if (result.confirmationSent) {
          setIsSignUp(false);
        }
      } else {
        await signIn(email, password);
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Filmly could not complete that request.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!isValidEmail || loading) return;
    resetMessages();
    setLoading(true);

    try {
      await resendConfirmation(email);
      setNotice(`Fresh confirmation email sent to ${email.trim()}. Open the link on this device to return to Filmly.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not resend the confirmation email.');
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (nextIsSignUp: boolean) => {
    if (nextIsSignUp === isSignUp) return;
    resetMessages();
    setIsSignUp(nextIsSignUp);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={{
          uri: 'https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=1100&q=80',
        }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
      >
        <LinearGradient
          colors={['rgba(2,18,24,0.34)', 'rgba(5,72,86,0.78)', colors.background]}
          style={StyleSheet.absoluteFill}
        />
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
          <View style={styles.hero}>
            <Image source={require('../../assets/filmly-logo.png')} style={styles.logo} resizeMode="contain" />
          </View>

          <View style={styles.panel}>
            <View style={styles.segment}>
              <Pressable onPress={() => switchMode(false)} style={[styles.segmentButton, !isSignUp && styles.segmentActive]}>
                <Ionicons name="log-in-outline" size={16} color={!isSignUp ? colors.background : colors.text} />
                <Text style={[styles.segmentText, !isSignUp && styles.segmentTextActive]}>Sign In</Text>
              </Pressable>
              <Pressable onPress={() => switchMode(true)} style={[styles.segmentButton, isSignUp && styles.segmentActive]}>
                <Ionicons name="person-add-outline" size={16} color={isSignUp ? colors.background : colors.text} />
                <Text style={[styles.segmentText, isSignUp && styles.segmentTextActive]}>Sign Up</Text>
              </Pressable>
            </View>

            <Text style={styles.panelTitle}>{isSignUp ? 'Create your Filmly profile' : 'Welcome back'}</Text>
            <Text style={styles.panelSub}>
              {isSignUp
                ? 'We will send a confirmation link that opens Filmly automatically.'
                : 'Sign in after confirming your email to sync your movies.'}
            </Text>

            {loading ? (
              <ActivityIndicator size="large" color={colors.accent} style={styles.loader} />
            ) : (
              <>
                <View style={styles.accountForm}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={styles.inputShell}>
                    <Ionicons name="mail-outline" size={18} color={colors.faint} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@domain.com"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoCorrect={false}
                    />
                  </View>

                  {isSignUp && (
                    <>
                      <Text style={styles.inputLabel}>Username</Text>
                      <View style={styles.inputShell}>
                        <Ionicons name="at-outline" size={18} color={colors.faint} />
                        <TextInput
                          value={username}
                          onChangeText={setUsername}
                          placeholder="cinema_fan"
                          placeholderTextColor={colors.faint}
                          style={styles.input}
                          autoCapitalize="none"
                          autoCorrect={false}
                        />
                      </View>
                    </>
                  )}

                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputShell}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.faint} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry
                      autoCorrect={false}
                      placeholder="At least 6 characters"
                      placeholderTextColor={colors.faint}
                      style={styles.input}
                    />
                  </View>

                  <Pressable
                    onPress={handleSubmit}
                    disabled={!canSubmit}
                    style={[styles.accountButton, !canSubmit && styles.disabledButton]}
                  >
                    <Text style={styles.accountButtonText}>{isSignUp ? 'Send Confirmation' : 'Sign In'}</Text>
                    <Ionicons name="arrow-forward" size={18} color={colors.background} />
                  </Pressable>
                </View>

                {error ? (
                  <View style={[styles.messageBox, styles.errorBox]}>
                    <Ionicons name="alert-circle-outline" size={18} color={colors.hot} />
                    <Text selectable style={[styles.messageText, styles.errorText]}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {activeNotice ? (
                  <View style={[styles.messageBox, noticeTone === 'error' && styles.errorBox]}>
                    <Ionicons
                      name={noticeTone === 'success' ? 'checkmark-circle-outline' : 'mail-unread-outline'}
                      size={18}
                      color={noticeTone === 'error' ? colors.hot : colors.accent}
                    />
                    <Text
                      selectable
                      style={[styles.messageText, noticeTone === 'error' && styles.errorText]}
                    >
                      {activeNotice}
                    </Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleResendConfirmation}
                  disabled={!isValidEmail}
                  style={[styles.resendButton, !isValidEmail && styles.disabledButton]}
                >
                  <Ionicons name="refresh-outline" size={16} color={colors.text} />
                  <Text style={styles.resendText}>Resend confirmation email</Text>
                </Pressable>
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
    paddingBottom: 30,
    paddingTop: 38,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 14,
  },
  logo: {
    height: 190,
    width: 190,
  },
  panel: {
    backgroundColor: 'rgba(7,48,58,0.86)',
    borderColor: 'rgba(245,254,255,0.18)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
  },
  segment: {
    backgroundColor: 'rgba(2,18,24,0.46)',
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    padding: 5,
  },
  segmentButton: {
    alignItems: 'center',
    borderRadius: 999,
    flex: 1,
    flexDirection: 'row',
    gap: 7,
    justifyContent: 'center',
    minHeight: 38,
  },
  segmentActive: {
    backgroundColor: colors.accent,
  },
  segmentText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  segmentTextActive: {
    color: colors.background,
  },
  panelTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
    marginTop: 18,
  },
  panelSub: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
    marginTop: 5,
  },
  accountForm: {
    marginTop: 8,
  },
  inputLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    marginBottom: 7,
    marginTop: 13,
    textTransform: 'uppercase',
  },
  inputShell: {
    alignItems: 'center',
    backgroundColor: 'rgba(2,18,24,0.5)',
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 12,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    minHeight: 50,
  },
  accountButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 18,
    minHeight: 50,
  },
  disabledButton: {
    opacity: 0.48,
  },
  accountButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  messageBox: {
    alignItems: 'flex-start',
    backgroundColor: 'rgba(154,242,240,0.11)',
    borderColor: 'rgba(154,242,240,0.28)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    marginTop: 12,
    padding: 12,
  },
  errorBox: {
    backgroundColor: 'rgba(255,95,127,0.1)',
    borderColor: 'rgba(255,95,127,0.3)',
  },
  messageText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 18,
  },
  errorText: {
    color: '#FFD7DF',
  },
  resendButton: {
    alignItems: 'center',
    borderColor: colors.line,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  resendText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  loader: {
    marginVertical: 32,
  },
});
