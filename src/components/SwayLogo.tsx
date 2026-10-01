import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../theme';

export function SwayLogo({ size = 36 }: { size?: number }) {
  const { colors } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="160 160 704 704" accessibilityLabel="Sway logo">
      <Circle cx="512" cy="512" r="330" fill="none" stroke={colors.border} strokeWidth="16" />
      <Path d="M310 536C310 346 426 288 538 324C654 362 664 490 520 512C370 536 374 660 488 700C606 742 714 664 714 488" fill="none" stroke={colors.accentRose} strokeWidth="48" strokeLinecap="round" />
      <Path d="M520 512C370 536 374 660 488 700C606 742 714 664 714 488" fill="none" stroke={colors.accentSage} strokeWidth="48" strokeLinecap="round" />
      <Circle cx="744" cy="278" r="22" fill={colors.accentRose} />
    </Svg>
  );
}
