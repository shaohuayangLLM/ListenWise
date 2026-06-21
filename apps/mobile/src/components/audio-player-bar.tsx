import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatTime } from '@/lib/format';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const ACCENT = '#c96442';

// 底部固定播放条:播放/暂停、进度、倍速。点句 seek 在文字稿里触发。
export function AudioPlayerBar({
  playing,
  currentTime,
  duration,
  rate,
  onTogglePlay,
  onCycleRate,
}: {
  playing: boolean;
  currentTime: number;
  duration: number;
  rate: number;
  onTogglePlay: () => void;
  onCycleRate: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const pct = duration > 0 ? Math.min(1, currentTime / duration) : 0;

  return (
    <ThemedView type="backgroundElement" style={[styles.bar, { paddingBottom: insets.bottom + Spacing.two }]}>
      <View style={[styles.progress, { backgroundColor: theme.backgroundSelected }]}>
        <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
      </View>
      <View style={styles.row}>
        <TouchableOpacity onPress={onTogglePlay} activeOpacity={0.8} style={styles.play}>
          <Ionicons name={playing ? 'pause' : 'play'} size={22} color="#ffffff" />
        </TouchableOpacity>
        <ThemedText type="small" themeColor="textSecondary">
          {formatTime(currentTime)} / {formatTime(duration)}
        </ThemedText>
        <View style={styles.spacer} />
        <TouchableOpacity
          onPress={onCycleRate}
          activeOpacity={0.7}
          style={[styles.rate, { borderColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{rate}x</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.two },
  progress: { height: 3, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, backgroundColor: ACCENT },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  play: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  spacer: { flex: 1 },
  rate: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
});
