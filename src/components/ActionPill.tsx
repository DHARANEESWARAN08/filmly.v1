import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors } from '../theme/colors';

type Props = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active?: boolean;
  onPress: () => void;
};

export function ActionPill({ label, icon, active, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.pill, active && styles.active, pressed && styles.pressed]}>
      <Ionicons name={icon} size={16} color={active ? colors.background : colors.text} />
      <Text style={[styles.label, active && styles.activeLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderColor: colors.line,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 12,
  },
  active: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '900',
  },
  activeLabel: {
    color: colors.background,
  },
  pressed: {
    opacity: 0.8,
  },
});
