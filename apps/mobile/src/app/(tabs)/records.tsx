import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { FlatList, RefreshControl, StyleSheet, TouchableOpacity, View } from 'react-native';

import { EmptyView, ErrorView, LoadingView } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Api } from '@/lib/api';
import { isTerminalStatus, statusLabel } from '@/lib/format';
import type { Recording } from '@/lib/types';

const SOURCE_LABEL: Record<string, string> = {
  podcast: '播客',
  upload: '本地音频',
  realtime: '实时记录',
};

export default function RecordsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const q = useQuery({ queryKey: ['recordings'], queryFn: () => Api.getRecordings(1, 50) });

  if (q.isLoading) return <LoadingView />;
  if (q.isError) return <ErrorView message={(q.error as Error)?.message} onRetry={() => q.refetch()} />;

  const items = q.data?.items ?? [];

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={items}
        keyExtractor={(r) => String(r.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={q.isFetching} onRefresh={() => q.refetch()} tintColor={theme.text} />}
        ListEmptyComponent={<EmptyView message="还没有转写记录。去「播客」获取一集试试。" />}
        renderItem={({ item }: { item: Recording }) => (
          <RecordingRow
            recording={item}
            onPress={() => router.push(`/recordings/${item.id}`)}
          />
        )}
      />
    </ThemedView>
  );
}

function RecordingRow({ recording, onPress }: { recording: Recording; onPress: () => void }) {
  const done = recording.status === 'done';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} disabled={!done}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowMain}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {recording.title}
          </ThemedText>
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              {SOURCE_LABEL[recording.source] ?? recording.source}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              ·
            </ThemedText>
            <ThemedText type="small" themeColor={done ? 'textSecondary' : 'text'}>
              {statusLabel(recording.status)}
            </ThemedText>
          </View>
        </View>
        {!isTerminalStatus(recording.status) ? (
          <View style={styles.dot} />
        ) : null}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  listContent: { padding: Spacing.three, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowMain: { flex: 1, gap: Spacing.one },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#c96442' },
});
