import * as Linking from 'expo-linking';
import type { Session, User } from '@supabase/supabase-js';

import { FilmlyUser } from '../types/auth';
import { supabase } from './supabase';

const AUTH_CALLBACK_PATH = 'auth/callback';

export const authCallbackUrl = Linking.createURL(AUTH_CALLBACK_PATH);

export type SignUpResult = {
  user: FilmlyUser;
  session: Session | null;
  confirmationSent: boolean;
  message: string;
};

export type AuthCallbackResult = {
  user: FilmlyUser | null;
  message: string | null;
};

function getAvatarUrl(username: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=0B4050&color=FFFFFF&size=150&bold=true`;
}

function cleanUsername(username: string) {
  return username.trim().toLowerCase().replace(/\s+/g, '.');
}

function fallbackUsername(authUser: User, emailFallback = '') {
  const metadataUsername =
    typeof authUser.user_metadata?.username === 'string' ? authUser.user_metadata.username : undefined;
  return metadataUsername || authUser.email?.split('@')[0] || emailFallback.split('@')[0] || 'Filmly Member';
}

function messageFromUnknownError(error: unknown) {
  return error && typeof error === 'object' && 'message' in error ? String(error.message) : '';
}

function statusFromUnknownError(error: unknown) {
  return error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
}

function formatAuthError(error: unknown, operation: 'signup' | 'login' | 'callback'): Error {
  const msg = messageFromUnknownError(error);
  const lowerMsg = msg.toLowerCase();
  const status = statusFromUnknownError(error);

  if (operation === 'signup') {
    if (lowerMsg.includes('rate limit') || status === 429) {
      return new Error('We sent a few emails too quickly. Wait a moment, then try again.');
    }
    if (lowerMsg.includes('already registered') || lowerMsg.includes('already exists')) {
      return new Error('That email already has a Filmly account. Try signing in, or resend the confirmation email.');
    }
    return new Error(msg || 'We could not create your Filmly account. Please try again.');
  }

  if (operation === 'login') {
    if (lowerMsg.includes('email not confirmed') || lowerMsg.includes('not confirmed')) {
      return new Error('Your email is not confirmed yet. Open the confirmation link, or resend it below.');
    }
    if (lowerMsg.includes('invalid grant') || lowerMsg.includes('invalid credentials')) {
      return new Error('That email or password does not look right. If you just joined, confirm your email first.');
    }
    return new Error(msg || 'We could not sign you in. Please try again.');
  }

  if (lowerMsg.includes('expired') || lowerMsg.includes('invalid')) {
    return new Error('That confirmation link is no longer valid. Please resend the email and try the new link.');
  }

  return new Error(msg || 'Filmly could not finish email confirmation. Please resend the confirmation email.');
}

async function userFromAuth(authUser: User, emailFallback = ''): Promise<FilmlyUser> {
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', authUser.id)
    .maybeSingle();

  const profileUsername = typeof profile?.username === 'string' ? profile.username : undefined;
  const username = profileUsername || fallbackUsername(authUser, emailFallback);

  return {
    id: authUser.id,
    email: authUser.email || emailFallback,
    username,
    name: username,
    avatar: getAvatarUrl(username),
  };
}

function parseUrlChunk(chunk: string, params: Record<string, string>) {
  chunk
    .replace(/^[?#]/, '')
    .split('&')
    .filter(Boolean)
    .forEach((part) => {
      const [rawKey, ...rawValue] = part.split('=');
      if (!rawKey) return;
      const key = decodeURIComponent(rawKey.replace(/\+/g, ' '));
      const value = decodeURIComponent(rawValue.join('=').replace(/\+/g, ' '));
      params[key] = value;
    });
}

function readAuthUrlParams(url: string) {
  const params: Record<string, string> = {};
  const [withoutHash, hash = ''] = url.split('#');
  const query = withoutHash.split('?')[1] || '';
  parseUrlChunk(query, params);
  parseUrlChunk(hash, params);
  const errorCode = params.errorCode || null;
  delete params.errorCode;

  return { params, errorCode };
}

export const authService = {
  redirectTo: authCallbackUrl,

  isAuthCallbackUrl(url: string) {
    const lowerUrl = url.toLowerCase();
    return (
      lowerUrl.includes(AUTH_CALLBACK_PATH) ||
      lowerUrl.includes('access_token=') ||
      lowerUrl.includes('refresh_token=') ||
      lowerUrl.includes('token_hash=') ||
      lowerUrl.includes('error_code=') ||
      lowerUrl.includes('error=')
    );
  },

  async completeAuthCallback(url: string): Promise<AuthCallbackResult> {
    if (!authService.isAuthCallbackUrl(url)) {
      return { user: null, message: null };
    }

    const { params, errorCode } = readAuthUrlParams(url);
    const callbackError = params.error || params.error_code || errorCode;
    if (callbackError) {
      const description = params.error_description || callbackError;
      throw formatAuthError({ message: description }, 'callback');
    }

    let session: Session | null = null;

    try {
      if (params.access_token && params.refresh_token) {
        const { data, error } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        });
        if (error) throw error;
        session = data.session;
      } else if (params.code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(params.code);
        if (error) throw error;
        session = data.session;
      } else if (params.token_hash) {
        const { data, error } = await supabase.auth.verifyOtp({
          type: (params.type || 'signup') as 'signup',
          token_hash: params.token_hash,
        });
        if (error) throw error;
        session = data.session;
      }

      if (!session?.user) {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();
        session = currentSession;
      }

      if (!session?.user) {
        return {
          user: null,
          message: 'Email confirmed. You can sign in to Filmly now.',
        };
      }

      return {
        user: await userFromAuth(session.user),
        message: 'Email confirmed. Welcome to Filmly. Your movie library is ready.',
      };
    } catch (error) {
      throw formatAuthError(error, 'callback');
    }
  },

  async signUp(email: string, password: string, username: string): Promise<SignUpResult> {
    const cleanEmail = email.trim();
    const normalizedUsername = cleanUsername(username);

    console.log(`[AUTH] Attempting signup for email: ${cleanEmail}`);

    if (!cleanEmail.includes('@')) {
      throw new Error('Enter a valid email address.');
    }

    if (normalizedUsername.length < 2 || password.length < 6) {
      throw new Error('Choose a username and a password with at least 6 characters.');
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          emailRedirectTo: authCallbackUrl,
          data: {
            username: normalizedUsername,
          },
        },
      });

      if (error) {
        throw formatAuthError(error, 'signup');
      }

      const authUser = data.user;
      if (!authUser) {
        throw new Error('Filmly created the account, but could not read the new user yet.');
      }

      const filmlyUser = await userFromAuth(authUser, cleanEmail);

      if (!data.session) {
        return {
          user: filmlyUser,
          session: null,
          confirmationSent: true,
          message: `Almost there. We sent a confirmation link to ${cleanEmail}. Open it on this device and Filmly will bring you straight back in.`,
        };
      }

      console.log(`[AUTH] Signup success: User created with ID: ${authUser.id}`);

      return {
        user: filmlyUser,
        session: data.session,
        confirmationSent: false,
        message: 'Account created. Welcome to Filmly.',
      };
    } catch (err) {
      const message = messageFromUnknownError(err);
      console.warn(`[AUTH] Signup failed: ${message}`);
      throw err;
    }
  },

  async signIn(email: string, password: string): Promise<FilmlyUser> {
    const cleanEmail = email.trim();
    console.log(`[AUTH] Attempting login for email: ${cleanEmail}`);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw formatAuthError(error, 'login');
      }

      const authUser = data.user;
      if (!authUser) {
        throw new Error('Filmly signed you in, but could not read your profile yet.');
      }

      console.log(`[AUTH] Login success: Logged in with ID: ${authUser.id}`);

      return userFromAuth(authUser, cleanEmail);
    } catch (err) {
      const message = messageFromUnknownError(err);
      console.warn(`[AUTH] Login failed: ${message}`);
      throw err;
    }
  },

  async resendConfirmation(email: string): Promise<void> {
    const cleanEmail = email.trim();
    if (!cleanEmail.includes('@')) {
      throw new Error('Enter your email address first.');
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: cleanEmail,
      options: {
        emailRedirectTo: authCallbackUrl,
      },
    });

    if (error) {
      throw formatAuthError(error, 'signup');
    }
  },

  async signOut(): Promise<void> {
    console.log('[AUTH] Attempting logout...');
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(`[AUTH] Logout failed: ${error.message}`);
      throw new Error(error.message);
    }
    console.log('[AUTH] Logout successful');
  },

  async getCurrentUser(): Promise<FilmlyUser | null> {
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    if (sessionError || !session?.user) {
      return null;
    }

    return userFromAuth(session.user);
  },
};
