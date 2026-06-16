import { Review } from '../types/movie';
import { env } from '../config/env';
import { safeStorage } from '../utils/storage';

const reviewSyncUrl = env.reviewSyncUrl.trim().replace(/\/$/, '');
const COMMUNITY_REVIEWS_KEY = 'filmly:community-reviews:v1';

function reviewAuthor(review: Review) {
  return (review.userEmail || review.userName || 'guest@filmly.app').trim().toLowerCase();
}

function reviewKey(review: Review) {
  return `${review.movieId}:${reviewAuthor(review)}`;
}

function remoteReviewKey(review: Review) {
  return reviewKey(review).replace(/[^a-z0-9_-]/gi, '_');
}

function dedupeReviews(reviews: Review[]) {
  const unique = new Map<string, Review>();

  reviews.forEach((review) => {
    const key = reviewKey(review);
    const existing = unique.get(key);
    if (!existing || new Date(review.createdAt).getTime() >= new Date(existing.createdAt).getTime()) {
      unique.set(key, review);
    }
  });

  return Array.from(unique.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

async function fetchLocalReviews(): Promise<Review[]> {
  const raw = await safeStorage.getItem(COMMUNITY_REVIEWS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? dedupeReviews(parsed) : [];
  } catch {
    return [];
  }
}

async function saveLocalReview(review: Review) {
  const reviews = await fetchLocalReviews();
  const next = dedupeReviews([review, ...reviews]);
  await safeStorage.setItem(COMMUNITY_REVIEWS_KEY, JSON.stringify(next));
}

export async function fetchAllReviews(): Promise<Review[]> {
  const localReviews = await fetchLocalReviews();
  if (!reviewSyncUrl) return localReviews;

  try {
    const response = await fetch(`${reviewSyncUrl}/reviews.json`);
    
    if (response.status === 404) {
      return localReviews;
    }
    
    if (!response.ok) {
      return localReviews;
    }
    
    const data = await response.json();
    if (!data) return localReviews;
    
    const remoteReviews = Object.keys(data).map((key) => ({
      ...data[key],
    })).reverse();

    return dedupeReviews([...localReviews, ...remoteReviews]);
  } catch {
    return localReviews;
  }
}

export async function saveReviewToSharedDb(review: Review): Promise<void> {
  await saveLocalReview(review);

  if (!reviewSyncUrl) return;

  try {
    const response = await fetch(`${reviewSyncUrl}/reviews/${remoteReviewKey(review)}.json`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(review),
    });
    
    if (!response.ok) return;
  } catch {
    return;
  }
}
