import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { FlatList, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '../components/EmptyState';
import { MoviePosterCard } from '../components/MoviePosterCard';
import { useApp } from '../context/AppContext';
import { colors, spacing } from '../theme/colors';
import { MovieSummary, Review } from '../types/movie';
import { RootStackParamList } from '../types/navigation';

type Navigation = NativeStackNavigationProp<RootStackParamList>;

export function ProfileScreen() {
  const navigation = useNavigation<Navigation>();
  const { user, signIn, signOut, data } = useApp();

  const favorites = Object.values(data?.favorites || {});
  const want = Object.values(data?.want || {});
  const watching = Object.values(data?.watching || {});
  const watched = Object.values(data?.watched || {});

  const openMovie = (movie: MovieSummary) => {
    navigation.navigate('MovieDetails', { movieId: movie.id });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatar}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person" size={28} color={colors.background} />
            )}
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name}>{user?.name || 'Filmly Member'}</Text>
            <Text style={styles.email}>{user?.email || 'Sign in to attach your Google identity'}</Text>
          </View>
          <Pressable onPress={user ? signOut : () => signIn()} style={styles.authButton}>
            <Ionicons name={user ? 'log-out-outline' : 'logo-google'} size={18} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Text style={styles.statsTitle}>Your Activity</Text>
            <Ionicons name="analytics-outline" size={19} color={colors.accent} />
          </View>
          <View style={styles.stats}>
            <Stat label="Watched" value={watched.length} color={colors.accent} />
            <Stat label="Reviews" value={data?.reviews?.length || 0} color={colors.gold} />
            <Stat label="Favorites" value={favorites.length} color={colors.hot} />
          </View>
        </View>

        <ProfileSection
          title="Favorites"
          movies={favorites}
          emptyTitle="No favorites yet"
          emptySubtitle="Start adding movies you love."
          onMoviePress={openMovie}
        />
        <ProfileSection
          title="Want to Watch"
          movies={want}
          emptyTitle="No movies in your watchlist."
          emptySubtitle="Discover movies and save them here."
          onMoviePress={openMovie}
        />
        <ProfileSection
          title="Watching"
          movies={watching}
          emptyTitle="Nothing playing right now."
          emptySubtitle="Mark a movie as watching when you start it."
          onMoviePress={openMovie}
        />
        <ProfileSection
          title="Watched"
          movies={watched}
          emptyTitle="No watched movies yet"
          emptySubtitle="Finished movies will show up here."
          onMoviePress={openMovie}
        />

        <View style={styles.reviewSection}>
          <Text style={styles.sectionTitle}>My Reviews</Text>
          {data?.reviews?.length ? (
            data.reviews.map((review) => <ReviewCard key={review.movieId} review={review} onPress={() => navigation.navigate('MovieDetails', { movieId: review.movieId })} />)
          ) : (
            <EmptyState icon="create-outline" title="No reviews yet" subtitle="Write a review from any movie details page." />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ProfileSection({
  title,
  movies,
  emptyTitle,
  emptySubtitle,
  onMoviePress,
}: {
  title: string;
  movies: MovieSummary[];
  emptyTitle: string;
  emptySubtitle: string;
  onMoviePress: (movie: MovieSummary) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {movies.length ? (
        <FlatList
          data={movies}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MoviePosterCard movie={item} onPress={onMoviePress} compact />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.movieList}
        />
      ) : (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      )}
    </View>
  );
}

function ReviewCard({ review, onPress }: { review: Review; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.reviewCard, pressed && styles.pressed]}>
      {review.posterPath ? (
        <Image source={{ uri: review.posterPath }} style={styles.reviewPoster} />
      ) : (
        <View style={[styles.reviewPoster, styles.posterFallback]}>
          <Ionicons name="film" size={22} color={colors.faint} />
        </View>
      )}
      <View style={styles.reviewBody}>
        <Text style={styles.reviewTitle}>{review.movieTitle}</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <Ionicons key={star} name={star <= review.rating ? 'star' : 'star-outline'} size={13} color={colors.gold} />
          ))}
        </View>
        <Text style={styles.reviewText} numberOfLines={2}>
          {review.text}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    padding: spacing.page,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingTop: 12,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    height: 58,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 58,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  headerText: {
    flex: 1,
  },
  name: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '900',
  },
  email: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  authButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    height: 42,
    justifyContent: 'center',
    width: 42,
  },
  statsCard: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 24,
    padding: 14,
  },
  statsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statsTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  stat: {
    flex: 1,
    paddingVertical: 6,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '900',
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '800',
    marginTop: 4,
  },
  section: {
    marginTop: 26,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 12,
  },
  movieList: {
    paddingRight: 4,
  },
  reviewSection: {
    marginTop: 26,
  },
  reviewCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    padding: 10,
  },
  reviewPoster: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    height: 96,
    width: 64,
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBody: {
    flex: 1,
  },
  reviewTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  ratingRow: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 7,
  },
  reviewText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  pressed: {
    opacity: 0.78,
  },
});
