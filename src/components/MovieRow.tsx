import { FlatList, StyleSheet, Text, View } from 'react-native';

import { colors, spacing } from '../theme/colors';
import { MovieSummary } from '../types/movie';
import { LoadingSkeleton } from './LoadingSkeleton';
import { MoviePosterCard } from './MoviePosterCard';

type Props = {
  title: string;
  movies: MovieSummary[];
  loading?: boolean;
  onMoviePress: (movie: MovieSummary) => void;
};

export function MovieRow({ title, movies, loading = false, onMoviePress }: Props) {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>{title}</Text>
      {loading ? (
        <FlatList
          data={[1, 2, 3, 4]}
          horizontal
          keyExtractor={(item) => String(item)}
          renderItem={() => <LoadingSkeleton />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      ) : (
        <FlatList
          data={movies}
          horizontal
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <MoviePosterCard movie={item} onPress={onMoviePress} />}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 28,
  },
  heading: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 14,
    paddingHorizontal: spacing.page,
  },
  list: {
    paddingLeft: spacing.page,
    paddingRight: 4,
  },
});
