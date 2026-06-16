import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { safeStorage } from '../utils/storage';

import { emptyUserData, loadUserData, moveStatus, saveUserData, toggleMovie, UserData } from '../services/backend';
import { FilmlyUser, signInWithGoogle } from '../services/auth';
import { MovieSummary, Review, WatchStatus } from '../types/movie';
import { saveReviewToSharedDb } from '../services/db';

type AppContextValue = {
  booting: boolean;
  user: FilmlyUser | null;
  data: UserData;
  signIn: (customUser?: FilmlyUser) => Promise<void>;
  signOut: () => Promise<void>;
  toggleFavorite: (movie: MovieSummary) => Promise<void>;
  setStatus: (movie: MovieSummary, status: WatchStatus) => Promise<void>;
  addReview: (review: Review) => Promise<void>;
  isFavorite: (movieId: number) => boolean;
  getStatus: (movieId: number) => WatchStatus | null;
};

const USER_KEY = 'filmly:google-user:v1';

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

export function AppProvider({ children }: PropsWithChildren) {
  const [booting, setBooting] = useState(true);
  const [user, setUser] = useState<FilmlyUser | null>(null);
  const [data, setData] = useState<UserData>(freshUserData);

  useEffect(() => {
    async function hydrate() {
      try {
        const savedUser = await safeStorage.getItem(USER_KEY);
        const parsedUser = savedUser ? JSON.parse(savedUser) : null;
        setUser(parsedUser);
        setData(await loadUserData(parsedUser?.email));
      } finally {
        setBooting(false);
      }
    }

    hydrate();
  }, []);

  const persist = useCallback(async (next: UserData) => {
    setData(next);
    await saveUserData(next, user?.email);
  }, [user?.email]);

  const signIn = useCallback(async (customUser?: FilmlyUser) => {
    const nextUser = customUser || (await signInWithGoogle());
    const scopedData = await loadUserData(nextUser.email);
    setUser(nextUser);
    setData(scopedData);
    await safeStorage.setItem(USER_KEY, JSON.stringify(nextUser));
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setData(freshUserData());
    await safeStorage.removeItem(USER_KEY);
  }, []);

  const toggleFavorite = useCallback(
    async (movie: MovieSummary) => {
      await persist({
        ...data,
        favorites: toggleMovie(data.favorites || {}, movie),
      });
    },
    [data, persist],
  );

  const setStatus = useCallback(
    async (movie: MovieSummary, status: WatchStatus) => {
      await persist(moveStatus(data, movie, status));
    },
    [data, persist],
  );

  const addReview = useCallback(
    async (review: Review) => {
      const enrichedReview: Review = {
        ...review,
        userName: user?.name || 'Filmly Member',
        userEmail: user?.email || 'member@filmly.local',
        userAvatar: user?.avatar || undefined,
      };

      const reviews = [enrichedReview, ...(data?.reviews || []).filter((item) => item.movieId !== review.movieId)];
      
      await persist({
        ...data,
        reviews,
        watched: {
          ...(data?.watched || {}),
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
        },
      });

      await saveReviewToSharedDb(enrichedReview);
    },
    [data, user, persist],
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
      signIn,
      signOut,
      toggleFavorite,
      setStatus,
      addReview,
      isFavorite,
      getStatus,
    }),
    [booting, user, data, signIn, signOut, toggleFavorite, setStatus, addReview, isFavorite, getStatus],
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
