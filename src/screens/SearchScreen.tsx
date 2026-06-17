import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { MoviePosterCard } from '../components/MoviePosterCard';
import { mockMovies } from '../data/mockMovies';
import { tmdb } from '../services/tmdb';
import { colors, spacing } from '../theme/colors';
import { MovieSummary } from '../types/movie';
import { RootStackParamList } from '../types/navigation';
import { yearFromDate } from '../utils/format';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function SearchScreen() {
  const navigation = useNavigation<Navigation>();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MovieSummary[]>([]);
  const [recommendations, setRecommendations] = useState<MovieSummary[]>(mockMovies.slice(0, 8));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    tmdb
      .popular()
      .then((movies) => {
        if (mounted && movies.length) {
          setRecommendations(movies.slice(0, 8));
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const handle = setTimeout(async () => {
      const nextQuery = query.trim();
      if (!nextQuery) {
        setResults([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      const movies = await tmdb.search(nextQuery);
      setResults(movies);
      setLoading(false);
    }, 320);

    return () => clearTimeout(handle);
  }, [query]);

  const openMovie = (movie: MovieSummary) => {
    navigation.navigate('MovieDetails', { movieId: movie.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <LinearGradient colors={[colors.background, '#064A58', colors.background]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
        <Text style={styles.subtitle}>Find films, save them, and build your watch history.</Text>
      </View>

      <View style={styles.searchBox}>
        <Ionicons name="search" size={20} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search movies"
          placeholderTextColor={colors.faint}
          style={styles.input}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} style={styles.clearButton}>
            <Ionicons name="close" size={18} color={colors.text} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator color={colors.accent} style={styles.loader} />
      ) : query.trim() && results.length === 0 ? (
        <View style={styles.emptyWrap}>
          <EmptyState title="No matches" subtitle="Try a different title or spelling." />
        </View>
      ) : !query.trim() ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.recommendContent}>
          <View style={styles.recommendHeader}>
            <Text style={styles.recommendKicker}>Before you search</Text>
            <Text style={styles.recommendTitle}>Recommended Movies</Text>
          </View>
          <FlatList
            data={recommendations}
            horizontal
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => <MoviePosterCard movie={item} onPress={openMovie} />}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recommendRail}
          />
          <View style={styles.quickGrid}>
            {recommendations.slice(0, 4).map((movie) => (
              <Pressable key={movie.id} onPress={() => openMovie(movie)} style={styles.quickPick}>
                <Ionicons name="sparkles-outline" size={16} color={colors.accent} />
                <Text style={styles.quickPickText} numberOfLines={1}>
                  {movie.title}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SearchResult movie={item} onPress={() => openMovie(item)} />}
          contentContainerStyle={styles.results}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function SearchResult({ movie, onPress }: { movie: MovieSummary; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.result, pressed && styles.pressed]}>
      {movie.posterPath ? (
        <Image source={{ uri: movie.posterPath }} style={styles.poster} />
      ) : (
        <View style={[styles.poster, styles.posterFallback]}>
          <Ionicons name="film" size={26} color={colors.faint} />
        </View>
      )}
      <View style={styles.resultBody}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {movie.title}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.year}>{yearFromDate(movie.releaseDate)}</Text>
          <View style={styles.dot} />
          <Ionicons name="star" size={12} color={colors.gold} />
          <Text style={styles.year}>{movie.rating.toFixed(1)}</Text>
        </View>
        <Text style={styles.overview} numberOfLines={2}>
          {movie.overview}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    paddingHorizontal: spacing.page,
    paddingTop: 12,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.1)',
    borderColor: 'rgba(245,254,255,0.18)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: spacing.page,
    marginTop: 18,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  clearButton: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  loader: {
    marginTop: 40,
  },
  emptyWrap: {
    paddingHorizontal: spacing.page,
    paddingTop: 24,
  },
  recommendContent: {
    paddingBottom: 110,
    paddingTop: 26,
  },
  recommendHeader: {
    gap: 4,
    paddingHorizontal: spacing.page,
  },
  recommendKicker: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  recommendTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  recommendRail: {
    paddingLeft: spacing.page,
    paddingRight: 4,
    paddingTop: 16,
  },
  quickGrid: {
    gap: 10,
    paddingHorizontal: spacing.page,
    paddingTop: 22,
  },
  quickPick: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 9,
    minHeight: 46,
    paddingHorizontal: 14,
  },
  quickPickText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: '800',
  },
  results: {
    gap: 12,
    padding: spacing.page,
    paddingBottom: 104,
  },
  result: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 10,
  },
  poster: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    height: 112,
    width: 76,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultBody: {
    flex: 1,
  },
  resultTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
    lineHeight: 21,
  },
  resultMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  year: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
  },
  dot: {
    backgroundColor: colors.faint,
    borderRadius: 2,
    height: 4,
    width: 4,
  },
  overview: {
    color: colors.faint,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.78,
  },
});
