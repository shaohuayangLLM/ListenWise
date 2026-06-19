import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { formatTime } from '@/lib/format';
import type { OutlineItem } from '@/lib/types';

import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

const ACCENT = '#c96442';

// AI 解读:tldr 摘要 + 带时间戳的章节大纲(点击 seek)。
export function SummaryView({
  summary,
  outline,
  onSeek,
}: {
  summary: string | null;
  outline: OutlineItem[];
  onSeek: (sec: number) => void;
}) {
  if (!summary && (!outline || outline.length === 0)) {
    return (
      <View style={styles.empty}>
        <ThemedText type="small" themeColor="textSecondary">
          暂无 AI 解读。播客单集转写完成后会自动生成。
        </ThemedText>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {summary ? (
        <View style={styles.block}>
          <ThemedText type="smallBold">摘要</ThemedText>
          <ThemedText type="default" themeColor="textSecondary" style={styles.body}>
            {summary}
          </ThemedText>
        </View>
      ) : null}

      {outline && outline.length > 0 ? (
        <View style={styles.block}>
          <ThemedText type="smallBold">章节</ThemedText>
          {outline.map((o, i) => (
            <TouchableOpacity key={i} onPress={() => onSeek(o.start_sec)} activeOpacity={0.7}>
              <ThemedView type="backgroundElement" style={styles.chapter}>
                <View style={styles.chapterHead}>
                  <ThemedText type="small" style={styles.time}>
                    {formatTime(o.start_sec)}
                  </ThemedText>
                  <ThemedText type="smallBold" style={styles.chapterTitle} numberOfLines={2}>
                    {o.title}
                  </ThemedText>
                </View>
                {o.points && o.points.length > 0
                  ? o.points.map((p, j) => (
                      <ThemedText key={j} type="small" themeColor="textSecondary">
                        · {p}
                      </ThemedText>
                    ))
                  : null}
              </ThemedView>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  content: { padding: Spacing.three, gap: Spacing.four, paddingBottom: Spacing.six },
  block: { gap: Spacing.two },
  body: { lineHeight: 24 },
  chapter: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.one },
  chapterHead: { flexDirection: 'row', gap: Spacing.two, alignItems: 'baseline' },
  time: { color: ACCENT },
  chapterTitle: { flex: 1 },
});
