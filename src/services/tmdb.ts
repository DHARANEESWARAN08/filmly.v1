import { mockMovies } from '../data/mockMovies';
import { Movie, MovieSummary } from '../types/movie';
import { env } from '../config/env';

const BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

type TmdbMovie = {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  runtime?: number;
};

type TmdbVideo = {
  key: string;
  name: string;
  site: string;
  type: string;
  official: boolean;
};

const genreMap: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  878: 'Sci-Fi',
  53: 'Thriller',
  10749: 'Romance',
};

function toSummary(movie: TmdbMovie): MovieSummary {
  return {
    id: movie.id,
    title: movie.title || movie.name || 'Untitled',
    posterPath: movie.poster_path ? `${IMAGE_BASE}${movie.poster_path}` : null,
    backdropPath: movie.backdrop_path ? `${BACKDROP_BASE}${movie.backdrop_path}` : null,
    rating: Number(movie.vote_average?.toFixed(1) || 0),
    releaseDate: movie.release_date || movie.first_air_date || 'Coming soon',
    overview: movie.overview || 'No overview available yet.',
    genres: movie.genres?.map((genre) => genre.name) || movie.genre_ids?.map((id) => genreMap[id]).filter(Boolean) || [],
  };
}

function toYoutubeTrailer(video: TmdbVideo | undefined) {
  if (!video) {
    return {
      trailerUrl: null,
      trailerThumbnailUrl: null,
    };
  }

  return {
    trailerUrl: `https://www.youtube.com/watch?v=${video.key}`,
    trailerThumbnailUrl: `https://img.youtube.com/vi/${video.key}/hqdefault.jpg`,
  };
}

async function request<T>(path: string): Promise<T> {
  const joiner = path.includes('?') ? '&' : '?';
  const response = await fetch(`${BASE_URL}${path}${joiner}api_key=${env.tmdbApiKey}`);

  if (!response.ok) {
    throw new Error(`TMDB request failed: ${response.status}`);
  }

  return response.json();
}

async function movieList(path: string, fallback: Movie[]): Promise<MovieSummary[]> {
  try {
    const data = await request<{ results: TmdbMovie[] }>(path);
    return data.results.slice(0, 12).map(toSummary);
  } catch {
    return fallback;
  }
}

async function movieTrailer(movieId: number) {
  try {
    const videos = await request<{ results: TmdbVideo[] }>(`/movie/${movieId}/videos?language=en-US`);
    const trailer =
      videos.results.find(
        (video) => video.site === 'YouTube' && video.type === 'Trailer' && video.official,
      ) ||
      videos.results.find((video) => video.site === 'YouTube' && video.type === 'Trailer') ||
      videos.results.find((video) => video.site === 'YouTube');

    return toYoutubeTrailer(trailer);
  } catch {
    return {
      trailerUrl: null,
      trailerThumbnailUrl: null,
    };
  }
}

export const tmdb = {
  popular: () => movieList('/movie/popular?language=en-US&page=1', mockMovies),
  upcoming: () => movieList('/movie/upcoming?language=en-US&page=1', [...mockMovies].reverse()),
  topRated: () => movieList('/movie/top_rated?language=en-US&page=1', [...mockMovies].sort((a, b) => b.rating - a.rating)),
  search: async (query: string): Promise<MovieSummary[]> => {
    if (!query.trim()) return [];
    try {
      const data = await request<{ results: TmdbMovie[] }>(
        `/search/movie?language=en-US&page=1&include_adult=false&query=${encodeURIComponent(query.trim())}`,
      );
      return data.results.slice(0, 20).map(toSummary);
    } catch {
      return mockMovies.filter((movie) => movie.title.toLowerCase().includes(query.toLowerCase()));
    }
  },
  details: async (movieId: number): Promise<Movie> => {
    const local = mockMovies.find((movie) => movie.id === movieId);
    try {
      const [movie, credits, trailer] = await Promise.all([
        request<TmdbMovie>(`/movie/${movieId}?language=en-US`),
        request<{ cast: { name: string }[] }>(`/movie/${movieId}/credits?language=en-US`),
        movieTrailer(movieId),
      ]);
      return {
        ...toSummary(movie),
        runtime: movie.runtime || local?.runtime || 110,
        cast: credits.cast.slice(0, 8).map((person) => person.name),
        trailerUrl: trailer.trailerUrl || local?.trailerUrl || null,
        trailerThumbnailUrl: trailer.trailerThumbnailUrl || local?.trailerThumbnailUrl || null,
      };
    } catch {
      return local || mockMovies[0];
    }
  },
  byGenre: async (genreId: number): Promise<MovieSummary[]> => {
    try {
      const data = await request<{ results: TmdbMovie[] }>(
        `/discover/movie?language=en-US&sort_by=popularity.desc&with_genres=${genreId}`,
      );
      return data.results.slice(0, 10).map(toSummary);
    } catch {
      return mockMovies.filter((movie) => movie.genres.length);
    }
  },
};
