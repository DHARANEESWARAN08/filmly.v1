import { safeStorage } from '../utils/storage';
import { MovieCollection, MovieSummary, Review, WatchStatus } from '../types/movie';

const STORAGE_PREFIX = 'filmly:user-data:v2';
const GUEST_PROFILE = 'guest';

export type UserData = {
  favorites: MovieCollection;
  want: MovieCollection;
  watching: MovieCollection;
  watched: MovieCollection;
  reviews: Review[];
};

export const emptyUserData: UserData = {
  favorites: {},
  want: {},
  watching: {},
  watched: {},
  reviews: [],
};

function profileKey(email?: string | null) {
  const profile = email?.trim().toLowerCase() || GUEST_PROFILE;
  return `${STORAGE_PREFIX}:${profile}`;
}

export async function loadUserData(email?: string | null): Promise<UserData> {
  try {
    const raw = await safeStorage.getItem(profileKey(email));
    if (!raw) return { ...emptyUserData };
    const parsed = JSON.parse(raw);
    return {
      favorites: parsed.favorites || {},
      want: parsed.want || {},
      watching: parsed.watching || {},
      watched: parsed.watched || {},
      reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    };
  } catch (e) {
    console.error('Failed to load user data:', e);
    return { ...emptyUserData };
  }
}

export async function saveUserData(data: UserData, email?: string | null) {
  await safeStorage.setItem(profileKey(email), JSON.stringify(data));
}

export function toggleMovie(collection: MovieCollection, movie: MovieSummary): MovieCollection {
  const next = { ...collection };
  if (next[movie.id]) {
    delete next[movie.id];
  } else {
    next[movie.id] = movie;
  }
  return next;
}

export function moveStatus(data: UserData, movie: MovieSummary, status: WatchStatus): UserData {
  const next: UserData = {
    ...data,
    want: { ...data.want },
    watching: { ...data.watching },
    watched: { ...data.watched },
  };

  delete next.want[movie.id];
  delete next.watching[movie.id];
  delete next.watched[movie.id];
  next[status][movie.id] = movie;
  return next;
}
