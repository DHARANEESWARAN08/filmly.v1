import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

import { env } from '../config/env';
import { safeStorage } from '../utils/storage';

WebBrowser.maybeCompleteAuthSession();

export type FilmlyUser = {
  name: string;
  email: string;
  avatar?: string;
  username?: string;
};

type LocalAccount = {
  name: string;
  username: string;
  passwordHash: string;
  avatar: string;
};

const LOCAL_ACCOUNTS_KEY = 'filmly:local-accounts:v1';

function normalizeUsername(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, '.');
}

function displayNameFromUsername(username: string) {
  return username
    .split(/[.\-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || 'Filmly Member';
}

async function passwordHash(username: string, password: string) {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${normalizeUsername(username)}:${password}`,
  );
}

async function loadLocalAccounts(): Promise<Record<string, LocalAccount>> {
  const raw = await safeStorage.getItem(LOCAL_ACCOUNTS_KEY);
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function saveLocalAccounts(accounts: Record<string, LocalAccount>) {
  await safeStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts));
}

export async function signInWithPassword(usernameValue: string, password: string): Promise<FilmlyUser> {
  const username = normalizeUsername(usernameValue);
  if (username.length < 2 || password.length < 4) {
    throw new Error('Enter a username and a password with at least 4 characters.');
  }

  const accounts = await loadLocalAccounts();
  const hash = await passwordHash(username, password);
  const existing = accounts[username];

  if (existing && existing.passwordHash !== hash) {
    throw new Error('That password does not match this username.');
  }

  const account =
    existing || {
      name: displayNameFromUsername(username),
      username,
      passwordHash: hash,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(displayNameFromUsername(username))}&background=FF1744&color=FFFFFF&size=150&bold=true`,
    };

  if (!existing) {
    accounts[username] = account;
    await saveLocalAccounts(accounts);
  }

  return {
    name: account.name,
    username: account.username,
    email: `${account.username}@filmly.local`,
    avatar: account.avatar,
  };
}

export async function signInWithGoogle(): Promise<FilmlyUser> {
  const clientId = env.googleAndroidClientId || env.googleWebClientId;

  if (!clientId) {
    throw new Error('Google OAuth client ID is not configured.');
  }

  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'filmly' });
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'token',
    scope: 'openid profile email',
    prompt: 'select_account',
  });

  const result = await WebBrowser.openAuthSessionAsync(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
    redirectUri,
  );

  if (result.type !== 'success') {
    throw new Error('Google sign-in was cancelled.');
  }

  const tokenParams = parseAuthParams(result.url);
  const accessToken = tokenParams.get('access_token');
  if (!accessToken) {
    throw new Error('Google did not return an access token.');
  }

  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = await response.json();

  return {
    name: profile.name || 'Filmly Member',
    email: profile.email || 'google.user@filmly.app',
    avatar: profile.picture,
  };
}

function parseAuthParams(url: string) {
  const hash = url.includes('#') ? url.split('#')[1] : '';
  const query = url.includes('?') ? url.split('?')[1] : '';
  return new URLSearchParams(hash || query);
}
