export type Movie = {
  id: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  rating: number;
  releaseDate: string;
  overview: string;
  genres: string[];
  runtime: number;
  cast: string[];
  trailerUrl?: string | null;
  trailerThumbnailUrl?: string | null;
};

export type MovieSummary = Pick<
  Movie,
  'id' | 'title' | 'posterPath' | 'backdropPath' | 'rating' | 'releaseDate' | 'overview' | 'genres'
>;

export type Review = {
  movieId: number;
  movieTitle: string;
  posterPath: string | null;
  rating: number;
  text: string;
  createdAt: string;
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
};

export type WatchStatus = 'want' | 'watching' | 'watched';

export type MovieCollection = Record<number, MovieSummary>;
