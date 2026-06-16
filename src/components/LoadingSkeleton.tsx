import { StyleSheet, View } from 'react-native';

import { colors } from '../theme/colors';

export function LoadingSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <View style={[styles.card, wide && styles.wide]}>
      <View style={styles.poster} />
      <View style={styles.line} />
      <View style={[styles.line, styles.short]} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginRight: 14,
    width: 132,
  },
  wide: {
    width: 168,
  },
  poster: {
    aspectRatio: 0.68,
    backgroundColor: colors.elevated,
    borderRadius: 8,
  },
  line: {
    backgroundColor: colors.elevated,
    borderRadius: 4,
    height: 10,
    marginTop: 10,
    width: '88%',
  },
  short: {
    width: '52%',
  },
});
