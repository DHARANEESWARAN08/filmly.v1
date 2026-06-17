import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ActionPill } from '../components/ActionPill';
import { useMovieActions } from '../hooks/useMovieActions';
import { tmdb } from '../services/tmdb';
import { colors, spacing } from '../theme/colors';
import { Movie, Review } from '../types/movie';
import { RootStackParamList } from '../types/navigation';
import { formatDate, formatRuntime } from '../utils/format';
import { reviewService } from '../services/reviewService';

type Props = NativeStackScreenProps<RootStackParamList, 'MovieDetails'>;

export function MovieDetailsScreen({ route, navigation }: Props) {
  const { movieId } = route.params;
  const { toggleFavorite, isFavorite, getStatus, setStatus, addReview, userReviews } = useMovieActions();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(4);
  const [saved, setSaved] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [communityReviews, setCommunityReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const loadCommunityReviews = async () => {
    try {
      setReviewsLoading(true);
      const reviews = await reviewService.fetchMovieReviews(movieId);
      setCommunityReviews(reviews);
    } catch (error) {
      console.warn('Error loading community reviews:', error);
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    async function loadMovie() {
      setLoading(true);
      const details = await tmdb.details(movieId);
      setMovie(details);
      setLoading(false);
    }

    loadMovie();
    loadCommunityReviews();
  }, [movieId]);

  useEffect(() => {
    const existingReview = userReviews?.find((review) => review.movieId === movieId);
    if (existingReview) {
      setReviewText(existingReview.text);
      setReviewRating(existingReview.rating);
    }
  }, [movieId, userReviews]);

  const summary = useMemo(() => {
    if (!movie) return null;
    return {
      id: movie.id,
      title: movie.title,
      posterPath: movie.posterPath,
      backdropPath: movie.backdropPath,
      rating: movie.rating,
      releaseDate: movie.releaseDate,
      overview: movie.overview,
      genres: movie.genres,
    };
  }, [movie]);

  const status = movie ? getStatus(movie.id) : null;

  const openTrailer = async () => {
    if (!movie?.trailerUrl) return;
    await WebBrowser.openBrowserAsync(movie.trailerUrl);
  };

  const saveReview = async () => {
    if (!movie || !reviewText.trim()) return;
    setReviewError('');
    try {
      await addReview({
        movieId: movie.id,
        movieTitle: movie.title,
        posterPath: movie.posterPath,
        rating: reviewRating,
        text: reviewText.trim(),
        createdAt: new Date().toISOString(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1400);
      await loadCommunityReviews();
    } catch (error) {
      setReviewError(
        error instanceof Error
          ? error.message
          : 'Could not save your review. Please check your Supabase login.',
      );
    }
  };

  if (loading || !movie || !summary) {
    return (
      <SafeAreaView style={styles.loadingScreen}>
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.background, '#064A58', colors.background]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ImageBackground source={{ uri: movie.backdropPath || movie.posterPath || undefined }} style={styles.backdrop}>
            <LinearGradient colors={['rgba(8,10,15,0.12)', colors.background]} style={styles.backdropOverlay} />
            <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
              <Ionicons name="chevron-back" size={22} color={colors.text} />
            </Pressable>
          </ImageBackground>

          <View style={styles.body}>
            <View style={styles.titleBlock}>
              {movie.posterPath ? (
                <Image source={{ uri: movie.posterPath }} style={styles.poster} />
              ) : (
                <View style={[styles.poster, styles.posterFallback]}>
                  <Ionicons name="film" size={34} color={colors.faint} />
                </View>
              )}
              <View style={styles.titleInfo}>
                <Text style={styles.title}>{movie.title}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={styles.metaStrong}>{movie.rating.toFixed(1)}</Text>
                  <Text style={styles.meta}>{formatDate(movie.releaseDate)}</Text>
                </View>
                <Text style={styles.meta}>{formatRuntime(movie.runtime)}</Text>
                <View style={styles.genreWrap}>
                  {movie.genres.slice(0, 3).map((genre) => (
                    <Text key={genre} style={styles.genre}>
                      {genre}
                    </Text>
                  ))}
                </View>
              </View>
            </View>

            <View style={styles.actionGrid}>
              <ActionPill
                label="Favorite"
                icon={isFavorite(movie.id) ? 'heart' : 'heart-outline'}
                active={isFavorite(movie.id)}
                onPress={() => toggleFavorite(summary)}
              />
              <ActionPill label="Want" icon="bookmark-outline" active={status === 'want'} onPress={() => setStatus(summary, 'want')} />
              <ActionPill
                label="Watching"
                icon="eye-outline"
                active={status === 'watching'}
                onPress={() => setStatus(summary, 'watching')}
              />
              <ActionPill
                label="Watched"
                icon="checkmark-circle-outline"
                active={status === 'watched'}
                onPress={() => setStatus(summary, 'watched')}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.overview}>{movie.overview}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Trailer</Text>
              {movie.trailerUrl ? (
                <Pressable onPress={openTrailer} style={styles.trailerCard}>
                  <ImageBackground
                    source={{ uri: movie.trailerThumbnailUrl || movie.backdropPath || movie.posterPath || undefined }}
                    style={styles.trailerImage}
                    imageStyle={styles.trailerImageShape}
                  >
                    <LinearGradient colors={['rgba(8,10,15,0.18)', 'rgba(8,10,15,0.82)']} style={styles.trailerOverlay} />
                    <View style={styles.playButton}>
                      <Ionicons name="play" size={28} color={colors.background} />
                    </View>
                    <View style={styles.trailerCopy}>
                      <Text style={styles.trailerEyebrow}>Official trailer</Text>
                      <Text style={styles.trailerTitle}>Watch {movie.title}</Text>
                    </View>
                  </ImageBackground>
                </Pressable>
              ) : (
                <View style={styles.emptyTrailer}>
                  <Ionicons name="videocam-off-outline" size={22} color={colors.faint} />
                  <Text style={styles.meta}>Trailer is not available yet.</Text>
                </View>
              )}
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Cast</Text>
              <View style={styles.castWrap}>
                {movie.cast.length ? (
                  movie.cast.map((person) => (
                    <Text key={person} style={styles.castPill}>
                      {person}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.meta}>Cast details are not available.</Text>
                )}
              </View>
            </View>

            <View style={styles.reviewBox}>
              <Text style={styles.sectionTitle}>My Review</Text>
              <View style={styles.stars}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Pressable key={star} onPress={() => setReviewRating(star)} style={styles.starButton}>
                    <Ionicons name={star <= reviewRating ? 'star' : 'star-outline'} size={28} color={colors.gold} />
                  </Pressable>
                ))}
              </View>
              <TextInput
                value={reviewText}
                onChangeText={setReviewText}
                multiline
                placeholder="Write what you felt about this movie..."
                placeholderTextColor={colors.faint}
                style={styles.reviewInput}
                textAlignVertical="top"
              />
              <Pressable onPress={saveReview} style={[styles.saveButton, !reviewText.trim() && styles.saveDisabled]}>
                <Ionicons name="create-outline" size={17} color={colors.background} />
                <Text style={styles.saveText}>{saved ? 'Saved' : 'Save Review'}</Text>
              </Pressable>
              {reviewError ? <Text style={styles.reviewError}>{reviewError}</Text> : null}
            </View>

            <View style={styles.communitySection}>
              <Text style={styles.sectionTitle}>Community Reviews</Text>
              {reviewsLoading ? (
                <ActivityIndicator color={colors.accent} style={{ marginVertical: 12 }} />
              ) : communityReviews.length ? (
                communityReviews.map((item, idx) => (
                  <View key={idx} style={styles.communityCard}>
                    <View style={styles.communityHeader}>
                      <View style={styles.authorAvatar}>
                        {item.userAvatar ? (
                          <Image source={{ uri: item.userAvatar }} style={styles.avatarImg} />
                        ) : (
                          <Text style={styles.avatarFallbackLetter}>
                            {(item.userName || 'G').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>
                      <View style={styles.authorInfo}>
                        <Text style={styles.authorName}>{item.userName || 'Anonymous'}</Text>
                        <View style={styles.communityStars}>
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Ionicons
                              key={star}
                              name={star <= item.rating ? 'star' : 'star-outline'}
                              size={12}
                              color={colors.gold}
                            />
                          ))}
                        </View>
                      </View>
                      <Text style={styles.reviewDate}>
                        {new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.communityText}>{item.text}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.noReviewsText}>Be the first to review this movie!</Text>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  loadingScreen: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingBottom: 104,
  },
  backdrop: {
    height: 310,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.12)',
    borderColor: 'rgba(245,254,255,0.22)',
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    left: spacing.page,
    position: 'absolute',
    top: 12,
    width: 42,
  },
  body: {
    marginTop: -92,
    paddingHorizontal: spacing.page,
  },
  titleBlock: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 14,
  },
  poster: {
    aspectRatio: 0.68,
    backgroundColor: colors.surface2,
    borderColor: 'rgba(245,254,255,0.2)',
    borderRadius: 8,
    borderWidth: 1,
    width: 128,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleInfo: {
    flex: 1,
    paddingBottom: 4,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 32,
  },
  metaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 10,
  },
  metaStrong: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  genreWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    marginTop: 12,
  },
  genre: {
    backgroundColor: 'rgba(245,254,255,0.1)',
    borderColor: 'rgba(245,254,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.muted,
    fontSize: 11,
    fontWeight: '900',
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 22,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  overview: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 23,
  },
  trailerCard: {
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  trailerImage: {
    aspectRatio: 16 / 9,
    justifyContent: 'center',
  },
  trailerImageShape: {
    borderRadius: 8,
  },
  trailerOverlay: {
    ...StyleSheet.absoluteFill,
  },
  playButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: colors.text,
    borderRadius: 34,
    height: 68,
    justifyContent: 'center',
    paddingLeft: 4,
    width: 68,
  },
  trailerCopy: {
    bottom: 16,
    left: 16,
    position: 'absolute',
    right: 16,
  },
  trailerEyebrow: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  trailerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '900',
    marginTop: 4,
  },
  emptyTrailer: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    minHeight: 64,
    paddingHorizontal: 14,
  },
  castWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  castPill: {
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  reviewBox: {
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 28,
    padding: 14,
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 12,
  },
  starButton: {
    paddingRight: 6,
  },
  reviewInput: {
    backgroundColor: 'rgba(2,18,24,0.5)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    minHeight: 112,
    padding: 12,
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: 999,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 46,
  },
  saveDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '900',
  },
  reviewError: {
    color: colors.hot,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    marginTop: 10,
    textAlign: 'center',
  },
  communitySection: {
    marginTop: 28,
  },
  communityCard: {
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  communityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  authorAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    overflow: 'hidden',
  },
  avatarImg: {
    width: '100%',
    height: '100%',
  },
  avatarFallbackLetter: {
    color: colors.background,
    fontWeight: '900',
    fontSize: 14,
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  communityStars: {
    flexDirection: 'row',
    marginTop: 2,
    gap: 2,
  },
  reviewDate: {
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
  },
  communityText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  noReviewsText: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
  },
});
