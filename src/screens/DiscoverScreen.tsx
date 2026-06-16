import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { MoviePosterCard } from '../components/MoviePosterCard';
import { MovieRow } from '../components/MovieRow';
import { useApp } from '../context/AppContext';
import { tmdb } from '../services/tmdb';
import { colors, spacing } from '../theme/colors';
import { MovieSummary } from '../types/movie';
import { RootStackParamList } from '../types/navigation';

const genres = [
  { id: 28, label: 'Action' },
  { id: 18, label: 'Drama' },
  { id: 878, label: 'Sci-Fi' },
  { id: 27, label: 'Horror' },
  { id: 35, label: 'Comedy' },
  { id: 10749, label: 'Romance' },
];

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function DiscoverScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, toggleFavorite, isFavorite } = useApp();
  const [popular, setPopular] = useState<MovieSummary[]>([]);
  const [upcoming, setUpcoming] = useState<MovieSummary[]>([]);
  const [topRated, setTopRated] = useState<MovieSummary[]>([]);
  const [genreMovies, setGenreMovies] = useState<MovieSummary[]>([]);
  const [selectedGenre, setSelectedGenre] = useState(genres[0].id);
  const [loading, setLoading] = useState(true);
  const [genreLoading, setGenreLoading] = useState(false);

  useEffect(() => {
    async function loadHome() {
      setLoading(true);
      const [popularMovies, upcomingMovies, topRatedMovies] = await Promise.all([
        tmdb.popular(),
        tmdb.upcoming(),
        tmdb.topRated(),
      ]);
      setPopular(popularMovies);
      setUpcoming(upcomingMovies);
      setTopRated(topRatedMovies);
      setLoading(false);
    }

    loadHome();
  }, []);

  useEffect(() => {
    async function loadGenre() {
      setGenreLoading(true);
      const movies = await tmdb.byGenre(selectedGenre);
      setGenreMovies(movies);
      setGenreLoading(false);
    }

    loadGenre();
  }, [selectedGenre]);

  const hero = useMemo(() => popular[0], [popular]);

  const openMovie = (movie: MovieSummary) => {
    navigation.navigate('MovieDetails', { movieId: movie.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <Image source={require('../../assets/filmly-logo.png')} style={styles.logo} resizeMode="contain" />
            <View>
              <Text style={styles.brandText}>Filmly</Text>
              <Text style={styles.brandSub}>{user ? `Hi, ${user.name}` : 'Your cinema dashboard'}</Text>
            </View>
          </View>
          <View style={styles.badge}>
            <Ionicons name="sparkles" size={16} color={colors.accent} />
          </View>
        </View>

        {hero ? (
          <Pressable onPress={() => openMovie(hero)} style={styles.hero}>
            <ImageBackground source={{ uri: hero.backdropPath || hero.posterPath || undefined }} style={styles.heroImage}>
              <LinearGradient colors={['rgba(8,10,15,0.05)', colors.background]} style={styles.heroOverlay} />
              <View style={styles.heroContent}>
                <View style={styles.heroEyebrow}>
                  <Ionicons name="flame" color={colors.hot} size={14} />
                  <Text style={styles.heroEyebrowText}>Trending now</Text>
                </View>
                <Text style={styles.heroTitle} numberOfLines={2}>
                  {hero.title}
                </Text>
                <Text style={styles.heroOverview} numberOfLines={2}>
                  {hero.overview}
                </Text>
                <View style={styles.heroActions}>
                  <Pressable onPress={() => openMovie(hero)} style={styles.primaryButton}>
                    <Ionicons name="play" size={16} color={colors.background} />
                    <Text style={styles.primaryButtonText}>Details</Text>
                  </Pressable>
                  <Pressable onPress={() => toggleFavorite(hero)} style={styles.iconButton}>
                    <Ionicons
                      name={isFavorite(hero.id) ? 'heart' : 'heart-outline'}
                      size={18}
                      color={isFavorite(hero.id) ? colors.hot : colors.text}
                    />
                  </Pressable>
                </View>
              </View>
            </ImageBackground>
          </Pressable>
        ) : (
          <View style={styles.heroLoading}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        <MovieRow title="Popular Movies" movies={popular} loading={loading} onMoviePress={openMovie} />
        <MovieRow title="Upcoming Movies" movies={upcoming} loading={loading} onMoviePress={openMovie} />
        <MovieRow title="Top Rated Movies" movies={topRated} loading={loading} onMoviePress={openMovie} />

        <View style={styles.genreSection}>
          <Text style={styles.heading}>Browse by Genre</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreChips}>
            {genres.map((genre) => {
              const active = selectedGenre === genre.id;
              return (
                <Pressable
                  key={genre.id}
                  onPress={() => setSelectedGenre(genre.id)}
                  style={[styles.genreChip, active && styles.genreChipActive]}
                >
                  <Text style={[styles.genreChipText, active && styles.genreChipTextActive]}>{genre.label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {genreLoading ? (
            <ActivityIndicator color={colors.accent} style={styles.genreLoader} />
          ) : genreMovies.length ? (
            <FlatList
              data={genreMovies}
              horizontal
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => <MoviePosterCard movie={item} onPress={openMovie} />}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.genreList}
            />
          ) : (
            <View style={styles.emptyPad}>
              <EmptyState title="No movies found" subtitle="Try another genre." />
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 28,
  },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.page,
    paddingVertical: 12,
  },
  brand: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  logo: {
    height: 48,
    width: 48,
  },
  brandText: {
    color: colors.text,
    fontSize: 25,
    fontWeight: '900',
  },
  brandSub: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 1,
  },
  badge: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  hero: {
    borderRadius: 8,
    height: 330,
    marginHorizontal: spacing.page,
    marginTop: 8,
    overflow: 'hidden',
  },
  heroImage: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
  },
  heroContent: {
    padding: 18,
  },
  heroEyebrow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
  },
  heroEyebrowText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    lineHeight: 38,
  },
  heroOverview: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '900',
  },
  iconButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    width: 48,
  },
  heroLoading: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 8,
    height: 330,
    justifyContent: 'center',
    marginHorizontal: spacing.page,
    marginTop: 8,
  },
  genreSection: {
    marginTop: 30,
  },
  heading: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 14,
    paddingHorizontal: spacing.page,
  },
  genreChips: {
    gap: 10,
    paddingHorizontal: spacing.page,
  },
  genreChip: {
    backgroundColor: colors.surface2,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  genreChipActive: {
    backgroundColor: colors.text,
    borderColor: colors.text,
  },
  genreChipText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '900',
  },
  genreChipTextActive: {
    color: colors.background,
  },
  genreList: {
    paddingLeft: spacing.page,
    paddingRight: 4,
    paddingTop: 16,
  },
  genreLoader: {
    marginTop: 30,
  },
  emptyPad: {
    paddingHorizontal: spacing.page,
    paddingTop: 14,
  },
});
