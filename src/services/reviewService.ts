import { supabase } from './supabase';
import { tmdb } from './tmdb';
import { Review } from '../types/movie';

function getAvatarUrl(username: string) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=FF1744&color=FFFFFF&size=150&bold=true`;
}

function formatDbError(error: any, table: string, operation: 'select' | 'insert' | 'update' | 'delete'): Error {
  if (!error) return new Error('Unknown database error');
  const msg = error.message || '';
  const isRLS =
    msg.toLowerCase().includes('row-level security') ||
    msg.toLowerCase().includes('violates row-level security') ||
    msg.toLowerCase().includes('policy') ||
    error.code === '42501';

  if (isRLS) {
    const preposition = operation === 'select' ? 'from' : 'into';
    return new Error(`Database error: User is not authorized to ${operation} ${preposition} ${table}`);
  }
  return new Error(`Database error: ${msg}`);
}

export const reviewService = {
  async fetchUserReviews(userId: string): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        movie_id,
        rating,
        review_text,
        created_at,
        profiles (
          email,
          username
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw formatDbError(error, 'reviews', 'select');
    }

    if (!data) return [];

    const reviews: Review[] = await Promise.all(
      data.map(async (row: any) => {
        const profile = row.profiles;
        const username = profile?.username || 'Filmly Member';
        const email = profile?.email || '';

        let movieTitle = 'Unknown Movie';
        let posterPath: string | null = null;

        try {
          const details = await tmdb.details(row.movie_id);
          movieTitle = details.title;
          posterPath = details.posterPath;
        } catch (err) {
          console.error(`Failed to fetch TMDB details for review ${row.id}:`, err);
        }

        return {
          movieId: row.movie_id,
          movieTitle,
          posterPath,
          rating: row.rating,
          text: row.review_text,
          createdAt: row.created_at,
          userName: username,
          userEmail: email,
          userAvatar: getAvatarUrl(username),
        };
      }),
    );

    return reviews;
  },

  async fetchMovieReviews(movieId: number): Promise<Review[]> {
    const { data, error } = await supabase
      .from('reviews')
      .select(`
        id,
        rating,
        review_text,
        created_at,
        profiles (
          email,
          username
        )
      `)
      .eq('movie_id', movieId)
      .order('created_at', { ascending: false });

    if (error) {
      throw formatDbError(error, 'reviews', 'select');
    }

    if (!data) return [];

    return data.map((row: any) => {
      const profile = row.profiles;
      const username = profile?.username || 'Anonymous';
      const email = profile?.email || '';

      return {
        movieId,
        movieTitle: '',
        posterPath: null,
        rating: row.rating,
        text: row.review_text,
        createdAt: row.created_at,
        userName: username,
        userEmail: email,
        userAvatar: getAvatarUrl(username),
      };
    });
  },

  async saveReview(
    userId: string,
    movieId: number,
    rating: number,
    text: string,
  ): Promise<void> {
    const { error } = await supabase
      .from('reviews')
      .upsert(
        {
          user_id: userId,
          movie_id: movieId,
          rating,
          review_text: text,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,movie_id' },
      );

    if (error) {
      throw formatDbError(error, 'reviews', 'insert');
    }
  },
};
