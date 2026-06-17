import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon = 'film-outline', title, subtitle }: Props) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={28} color={colors.faint} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    backgroundColor: 'rgba(245,254,255,0.09)',
    borderColor: 'rgba(245,254,255,0.16)',
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
