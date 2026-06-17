import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import * as Linking from 'expo-linking';

import { supabase } from '../services/supabase';
import { authService, SignUpResult } from '../services/authService';
import { favoriteService } from '../services/favoriteService';
import { watchlistService } from '../services/watchlistService';
import { reviewService } from '../services/reviewService';
import { FilmlyUser } from '../types/auth';
import { MovieCollection, MovieSummary, Review, WatchStatus } from '../types/movie';

export type UserData = {
  favorites: MovieCollection;
  want: MovieCollection;
  watching: MovieCollection;
  watched: MovieCollection;
  reviews: Review[];
};

export type AuthNotice = {
  tone: 'success' | 'info' | 'error';
  message: string;
};

type AppContextValue = {
  booting: boolean;
  user: FilmlyUser | null;
  data: UserData;
  authNotice: AuthNotice | null;
  clearAuthNotice: () => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, username: string) => Promise<SignUpResult>;
  resendConfirmation: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavorite: (movie: MovieSummary) => Promise<void>;
  setStatus: (movie: MovieSummary, status: WatchStatus) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  isFavorite: (movieId: number) => boolean;
  getStatus: (movieId: number) => WatchStatus | null;
};

const AppContext = createContext<AppContextValue | null>(null);

function freshUserData(): UserData {
  return {
    favorites: {},
    want: {},
    watching: {},
    watched: {},
    reviews: [],
  };
}

async function loadRemoteUserData(userId: string): Promise<UserData> {
  const [favs, watch, revs] = await Promise.all([
    favoriteService.fetchFavorites(userId),
    watchlistService.fetchWatchlist(userId),
    reviewService.fetchUserReviews(userId),
  ]);

  return {
    favorites: favs,
    want: watch.want,
    watching: watch.watching,
    watched: watch.watched,
    reviews: revs,
  };
}

export function AppProvider({ children }: PropsWithChildren) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<FilmlyUser | null>(null);
  const [data, setData] = useState<UserData>(freshUserData);
  const [authNotice, setAuthNotice] = useState<AuthNotice | null>(null);
  const sessionRestoredOnceRef = useRef(false);

  const clearAuthNotice = useCallback(() => {
    setAuthNotice(null);
  }, []);

  const clearLocalSession = useCallback(() => {
    setUser(null);
    setData(freshUserData());
  }, []);

  const loadCurrentAuthState = useCallback(async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      return null;
    }

    const nextData = await loadRemoteUserData(currentUser.id);
    return { currentUser, nextData };
  }, []);

  useEffect(() => {
    let mounted = true;

    console.log('[AUTH] AUTH_PROVIDER_MOUNTED');
    console.log('[AUTH] AUTH_LISTENER_CREATED');

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') {
        if (sessionRestoredOnceRef.current) {
          return;
        }

        sessionRestoredOnceRef.current = true;

        try {
          if (session?.user) {
            const restoredState = await loadCurrentAuthState();
            if (!mounted) return;

            if (restoredState) {
              setUser(restoredState.currentUser);
              setData(restoredState.nextData);
              console.log(`[AUTH] SESSION_RESTORED_ONCE user ID: ${restoredState.currentUser.id}`);
            } else {
              clearLocalSession();
              console.log('[AUTH] SESSION_RESTORED_ONCE no active session');
            }
          } else {
            clearLocalSession();
            console.log('[AUTH] SESSION_RESTORED_ONCE no active session');
          }
        } catch (e) {
          console.warn('Failed to restore initial auth session:', e);
          if (mounted) {
            clearLocalSession();
          }
        } finally {
          if (mounted) {
            setBooting(false);
          }
        }
        return;
      }

      if (event === 'SIGNED_OUT') {
        if (mounted) {
          clearLocalSession();
          setBooting(false);
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        if (mounted) {
          setBooting(false);
        }
      }
    });

    return () => {
      mounted = false;
      console.log('[AUTH] AUTH_LISTENER_REMOVED');
      subscription.unsubscribe();
    };
  }, [clearLocalSession, loadCurrentAuthState]);

  useEffect(() => {
    let mounted = true;

    const handleAuthUrl = async (url: string | null) => {
      if (!url || !authService.isAuthCallbackUrl(url)) return;

      setBooting(true);
      try {
        const result = await authService.completeAuthCallback(url);
        if (!mounted) return;

        if (result.user) {
          const nextData = await loadRemoteUserData(result.user.id);
          if (!mounted) return;
          setUser(result.user);
          setData(nextData);
          setAuthNotice({
            tone: 'success',
            message: result.message || 'Email confirmed. Welcome to Filmly.',
          });
        } else if (result.message) {
          setAuthNotice({
            tone: 'info',
            message: result.message,
          });
        }
      } catch (error) {
        if (mounted) {
          setAuthNotice({
            tone: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Filmly could not finish email confirmation. Please resend the confirmation email.',
          });
        }
      } finally {
        if (mounted) {
          setBooting(false);
        }
      }
    };

    Linking.getInitialURL().then(handleAuthUrl).catch(() => undefined);
    const subscription = Linking.addEventListener('url', ({ url }) => {
      handleAuthUrl(url);
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    setBooting(true);
    setAuthNotice(null);
    try {
      const filmlyUser = await authService.signIn(email, password);
      setUser(filmlyUser);
      setData(await loadRemoteUserData(filmlyUser.id));
    } finally {
      setBooting(false);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string, username: string) => {
    setBooting(true);
    setAuthNotice(null);
    try {
      const result = await authService.signUp(email, password, username);
      if (result.session) {
        setUser(result.user);
        setData(await loadRemoteUserData(result.user.id));
        setAuthNotice({ tone: 'success', message: result.message });
      } else if (result.confirmationSent) {
        setAuthNotice({ tone: 'info', message: result.message });
      }
      return result;
    } finally {
      setBooting(false);
    }
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    await authService.resendConfirmation(email);
    setAuthNotice({
      tone: 'info',
      message: `Fresh confirmation email sent to ${email.trim()}. Open the link on this device to return to Filmly.`,
    });
  }, []);

  const signOut = useCallback(async () => {
    setBooting(true);
    setAuthNotice(null);
    try {
      await authService.signOut();
      setUser(null);
      setData(freshUserData());
    } finally {
      setBooting(false);
    }
  }, []);

  const toggleFavorite = useCallback(
    async (movie: MovieSummary) => {
      if (!user) return;
      const nextFavs = { ...data.favorites };
      const isFav = Boolean(nextFavs[movie.id]);

      // Optimistic update
      if (isFav) {
        delete nextFavs[movie.id];
      } else {
        nextFavs[movie.id] = movie;
      }
      setData((prev) => ({ ...prev, favorites: nextFavs }));

      try {
        if (isFav) {
          await favoriteService.removeFavorite(user.id, movie.id);
        } else {
          await favoriteService.addFavorite(user.id, movie.id);
        }
      } catch (err) {
        console.warn('Failed to toggle favorite in database:', err);
        // Rollback
        const originalFavs = await favoriteService.fetchFavorites(user.id);
        setData((prev) => ({ ...prev, favorites: originalFavs }));
      }
    },
    [data.favorites, user],
  );

  const setStatus = useCallback(
    async (movie: MovieSummary, status: WatchStatus) => {
      if (!user) return;

      // Optimistic update
      const next = {
        ...data,
        want: { ...data.want },
        watching: { ...data.watching },
        watched: { ...data.watched },
      };

      delete next.want[movie.id];
      delete next.watching[movie.id];
      delete next.watched[movie.id];

      next[status][movie.id] = movie;
      setData(next);

      try {
        await watchlistService.setWatchlistStatus(user.id, movie.id, status);
      } catch (err) {
        console.warn('Failed to set watchlist status in database:', err);
        // Rollback
        const watch = await watchlistService.fetchWatchlist(user.id);
        setData((prev) => ({
          ...prev,
          want: watch.want,
          watching: watch.watching,
          watched: watch.watched,
        }));
      }
    },
    [data, user],
  );

  const addReview = useCallback(
    async (review: Review) => {
      if (!user) return;

      const enrichedReview: Review = {
        ...review,
        userName: user.name || 'Filmly Member',
        userEmail: user.email || 'member@filmly.local',
        userAvatar: user.avatar || undefined,
      };

      // Optimistic update
      const nextReviews = [
        enrichedReview,
        ...(data.reviews || []).filter((item) => item.movieId !== review.movieId),
      ];
      const nextWatched = {
        ...(data.watched || {}),
        [review.movieId]: {
          id: review.movieId,
          title: review.movieTitle,
          posterPath: review.posterPath,
          backdropPath: null,
          rating: review.rating,
          releaseDate: '',
          overview: review.text,
          genres: [],
        },
      };

      setData((prev) => ({
        ...prev,
        reviews: nextReviews,
        watched: nextWatched,
      }));

      try {
        await Promise.all([
          reviewService.saveReview(user.id, review.movieId, review.rating, review.text),
          watchlistService.setWatchlistStatus(user.id, review.movieId, 'watched'),
        ]);
      } catch (err) {
        console.warn('Failed to save review in database:', err);
        // Rollback
        const [revs, watch] = await Promise.all([
          reviewService.fetchUserReviews(user.id),
          watchlistService.fetchWatchlist(user.id),
        ]);
        setData((prev) => ({
          ...prev,
          reviews: revs,
          want: watch.want,
          watching: watch.watching,
          watched: watch.watched,
        }));
        throw err;
      }
    },
    [data.reviews, data.watched, user],
  );

  const isFavorite = useCallback((movieId: number) => Boolean(data?.favorites?.[movieId]), [data?.favorites]);

  const getStatus = useCallback(
    (movieId: number): WatchStatus | null => {
      if (!data) return null;
      if (data.want?.[movieId]) return 'want';
      if (data.watching?.[movieId]) return 'watching';
      if (data.watched?.[movieId]) return 'watched';
      return null;
    },
    [data],
  );

  const value = useMemo(
    () => ({
      booting,
      user,
      data,
      authNotice,
      clearAuthNotice,
      signIn,
      signUp,
      resendConfirmation,
      signOut,
      toggleFavorite,
      setStatus,
      addReview,
      isFavorite,
      getStatus,
    }),
    [
      booting,
      user,
      data,
      authNotice,
      clearAuthNotice,
      signIn,
      signUp,
      resendConfirmation,
      signOut,
      toggleFavorite,
      setStatus,
      addReview,
      isFavorite,
      getStatus,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used inside AppProvider');
  }
  return context;
}
