/**
 * Screen — Safe-area-aware root container for every Sway screen.
 *
 * Applies the role's background and the top system inset so content never
 * slides under the Android status bar (edge-to-edge is default on modern
 * Android). Pass `includeBottom` for full-screen modals presented outside
 * the tab bar (Paywall, Pairing) so they also clear the gesture/nav bar.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStyles, type Palette } from '../theme';

interface ScreenProps {
  children: React.ReactNode;
  /** Also apply the bottom system inset (for full-screen modals). */
  includeBottom?: boolean;
}

export function Screen({ children, includeBottom = false }: ScreenProps) {
  const { styles } = useThemeStyles(createStyles);
  return (
    <SafeAreaView
      style={styles.root}
      edges={includeBottom ? ['top', 'bottom'] : ['top']}
    >
      {children}
    </SafeAreaView>
  );
}

const createStyles = (colors: Palette) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
});

export default Screen;
