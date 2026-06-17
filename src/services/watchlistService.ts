import { supabase } from './supabase';
import { tmdb } from './tmdb';
import { MovieCollection, MovieSummary, WatchStatus } from '../types/movie';

const statusMapLocalToDb: Record<WatchStatus, string> = {
  want: 'want_to_watch',
  watching: 'watching',
  watched: 'watched',
};

const statusMapDbToLocal: Record<string, WatchStatus> = {
  want_to_watch: 'want',
  watching: 'watching',
  watched: 'watched',
};

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

export const watchlistService = {
  async fetchWatchlist(userId: string) {
    const { data, error } = await supabase
      .from('watchlist')
      .select('movie_id, status')
      .eq('user_id', userId);

    if (error) {
      throw formatDbError(error, 'watchlist', 'select');
    }

    const want: MovieCollection = {};
    const watching: MovieCollection = {};
    const watched: MovieCollection = {};

    await Promise.all(
      data.map(async (row) => {
        try {
          const details = await tmdb.details(row.movie_id);
          const summary: MovieSummary = {
            id: details.id,
            title: details.title,
            posterPath: details.posterPath,
            backdropPath: details.backdropPath,
            rating: details.rating,
            releaseDate: details.releaseDate,
            overview: details.overview,
            genres: details.genres,
          };

          const localStatus = statusMapDbToLocal[row.status];
          if (localStatus === 'want') {
            want[row.movie_id] = summary;
          } else if (localStatus === 'watching') {
            watching[row.movie_id] = summary;
          } else if (localStatus === 'watched') {
            watched[row.movie_id] = summary;
          }
        } catch (err) {
          console.error(`Failed to fetch TMDB details for watchlist item ${row.movie_id}:`, err);
        }
      }),
    );

    return { want, watching, watched };
  },

  async setWatchlistStatus(userId: string, movieId: number, status: WatchStatus): Promise<void> {
    const dbStatus = statusMapLocalToDb[status];
    const { error } = await supabase
      .from('watchlist')
      .upsert(
        {
          user_id: userId,
          movie_id: movieId,
          status: dbStatus,
        },
        { onConflict: 'user_id,movie_id' },
      );

    if (error) {
      throw formatDbError(error, 'watchlist', 'insert');
    }
  },

  async removeFromWatchlist(userId: string, movieId: number): Promise<void> {
    const { error } = await supabase
      .from('watchlist')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);

    if (error) {
      throw formatDbError(error, 'watchlist', 'delete');
    }
  },
};
