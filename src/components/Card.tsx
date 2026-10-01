/**
 * Card — Elevated surface container using the current role's palette.
 */
import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';
import { useThemeStyles, type Palette, spacing, elevation, radius } from '../theme';

interface CardProps extends ViewProps {
  children: React.ReactNode;
}

export function Card({ children, style, ...rest }: CardProps) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  card: {
    backgroundColor: colors.backgroundSurface,
    ...elevation.card,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md + 4,
  },
});

export default Card;
