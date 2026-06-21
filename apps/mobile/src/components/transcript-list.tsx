import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { speakerName } from '@/lib/format';
import type { TranscriptSegment } from '@/lib/types';

import { ThemedText } from './themed-text';

const ACCENT = '#c96442';

// 文字稿:FlatList 虚拟列表;高亮当前句;点句 seek;播放时自动滚动跟随。
export function TranscriptList({
  segments,
  speakerLabels,
  activeIndex,
  isPlaying,
  onSeek,
}: {
  segments: TranscriptSegment[];
  speakerLabels: Record<string, string>;
  activeIndex: number;
  isPlaying: boolean;
  onSeek: (sec: number) => void;
}) {
  const theme = useTheme();
  const ref = useRef<FlatList<TranscriptSegment>>(null);

  useEffect(() => {
    if (isPlaying && activeIndex >= 0 && activeIndex < segments.length) {
      ref.current?.scrollToIndex({ index: activeIndex, viewPosition: 0.4, animated: true });
    }
  }, [activeIndex, isPlaying, segments.length]);

  return (
    <FlatList
      ref={ref}
      data={segments}
      keyExtractor={(_, i) => String(i)}
      contentContainerStyle={styles.content}
      onScrollToIndexFailed={(info) => {
        // 变高列表估算失败时,延迟用近似偏移兜底,避免崩溃。
        setTimeout(() => {
          ref.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
        }, 50);
      }}
      renderItem={({ item, index }) => {
        const active = index === activeIndex;
        const name = speakerName(item.speaker, speakerLabels);
        return (
          <TouchableOpacity onPress={() => onSeek(item.start)} activeOpacity={0.6}>
            <View style={[styles.seg, active ? { backgroundColor: theme.backgroundElement } : null]}>
              {name ? (
                <ThemedText type="small" style={[styles.speaker, active ? { color: ACCENT } : null]}>
                  {name}
                </ThemedText>
              ) : null}
              <ThemedText type="default" style={styles.text}>
                {item.text}
              </ThemedText>
            </View>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.two },
  seg: { padding: Spacing.two, borderRadius: Spacing.two, gap: Spacing.half },
  speaker: { fontWeight: '700' },
  text: { lineHeight: 24 },
});
