import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';
import { MovieSummary } from '../types/movie';
import { yearFromDate } from '../utils/format';

type Props = {
  movie: MovieSummary;
  onPress: (movie: MovieSummary) => void;
  compact?: boolean;
};

export function MoviePosterCard({ movie, onPress, compact = false }: Props) {
  return (
    <Pressable
      onPress={() => onPress(movie)}
      style={({ pressed }) => [styles.card, compact && styles.compact, pressed && styles.pressed]}
    >
      <View style={styles.posterWrap}>
        {movie.posterPath ? (
          <Image source={{ uri: movie.posterPath }} style={styles.poster} />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <Ionicons name="film" size={32} color={colors.faint} />
          </View>
        )}
        <View style={styles.rating}>
          <Ionicons name="star" size={11} color={colors.gold} />
          <Text style={styles.ratingText}>{movie.rating.toFixed(1)}</Text>
        </View>
      </View>
      <Text numberOfLines={2} style={styles.title}>
        {movie.title}
      </Text>
      <Text style={styles.year}>{yearFromDate(movie.releaseDate)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 14,
    width: 132,
  },
  compact: {
    marginRight: 10,
    width: 112,
  },
  posterWrap: {
    backgroundColor: colors.surface2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  poster: {
    aspectRatio: 0.68,
    width: '100%',
  },
  posterFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rating: {
    alignItems: 'center',
    backgroundColor: 'rgba(8,10,15,0.86)',
    borderRadius: 8,
    flexDirection: 'row',
    gap: 4,
    left: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    position: 'absolute',
    top: 8,
  },
  ratingText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '800',
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 17,
    marginTop: 9,
  },
  year: {
    color: colors.faint,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
});
