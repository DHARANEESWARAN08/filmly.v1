import { supabase } from './supabase';
import { tmdb } from './tmdb';
import { MovieCollection, MovieSummary } from '../types/movie';

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

export const favoriteService = {
  async fetchFavorites(userId: string): Promise<MovieCollection> {
    const { data, error } = await supabase
      .from('favorites')
      .select('movie_id')
      .eq('user_id', userId);

    if (error) {
      throw formatDbError(error, 'favorites', 'select');
    }

    const movieIds = data.map((row) => row.movie_id);
    const collection: MovieCollection = {};

    await Promise.all(
      movieIds.map(async (id) => {
        try {
          const details = await tmdb.details(id);
          collection[id] = {
            id: details.id,
            title: details.title,
            posterPath: details.posterPath,
            backdropPath: details.backdropPath,
            rating: details.rating,
            releaseDate: details.releaseDate,
            overview: details.overview,
            genres: details.genres,
          };
        } catch (err) {
          console.error(`Failed to fetch TMDB details for favorite ${id}:`, err);
        }
      }),
    );

    return collection;
  },

  async addFavorite(userId: string, movieId: number): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .upsert(
        {
          user_id: userId,
          movie_id: movieId,
        },
        { onConflict: 'user_id,movie_id' },
      );

    if (error) {
      throw formatDbError(error, 'favorites', 'insert');
    }
  },

  async removeFavorite(userId: string, movieId: number): Promise<void> {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('movie_id', movieId);

    if (error) {
      throw formatDbError(error, 'favorites', 'delete');
    }
  },
};
