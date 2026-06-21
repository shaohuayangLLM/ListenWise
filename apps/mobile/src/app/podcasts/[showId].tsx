import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, StyleSheet, TouchableOpacity, View } from 'react-native';

import { Cover } from '@/components/cover';
import { EmptyView, ErrorView, LoadingView } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Api } from '@/lib/api';
import { formatTime, statusLabel } from '@/lib/format';
import type { PodcastEpisode, PodcastShow } from '@/lib/types';

const ACCENT = '#c96442';

export default function ShowDetailScreen() {
  const { showId } = useLocalSearchParams<{ showId: string }>();
  const id = Number(showId);
  const valid = Number.isFinite(id);
  const router = useRouter();
  const qc = useQueryClient();

  const showQ = useQuery({ queryKey: ['show', id], queryFn: () => Api.getShow(id), enabled: valid });
  const epsQ = useQuery({ queryKey: ['episodes', id], queryFn: () => Api.getEpisodes(id), enabled: valid });
  const loadMoreM = useMutation({
    mutationFn: () => Api.loadMoreEpisodes(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episodes', id] }),
  });

  const show = showQ.data;
  const title = show?.title ?? '节目';

  if (epsQ.isLoading) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title }} />
        <LoadingView />
      </ThemedView>
    );
  }
  if (epsQ.isError) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title }} />
        <ErrorView message={(epsQ.error as Error)?.message} onRetry={() => epsQ.refetch()} />
      </ThemedView>
    );
  }

  const episodes = epsQ.data ?? [];

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title }} />
      <FlatList
        data={episodes}
        keyExtractor={(e) => String(e.id)}
        contentContainerStyle={styles.content}
        ListHeaderComponent={show ? <ShowHeader show={show} /> : null}
        ListEmptyComponent={<EmptyView message="暂无可显示的单集。" />}
        ListFooterComponent={
          show && !show.source_limited && episodes.length > 0 ? (
            <TouchableOpacity
              style={styles.loadMore}
              onPress={() => loadMoreM.mutate()}
              disabled={loadMoreM.isPending}
              activeOpacity={0.7}>
              <ThemedText type="smallBold" style={{ color: ACCENT }}>
                {loadMoreM.isPending ? '加载中…' : '加载更多'}
              </ThemedText>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }: { item: PodcastEpisode }) => (
          <EpisodeRow episode={item} onPress={() => router.push(`/podcasts/episode/${item.id}`)} />
        )}
      />
    </ThemedView>
  );
}

function ShowHeader({ show }: { show: PodcastShow }) {
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <Cover uri={show.cover_url} size={72} />
        <View style={styles.headerMeta}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {show.title}
          </ThemedText>
          {show.author ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {show.author}
            </ThemedText>
          ) : null}
          <ThemedText type="small" themeColor="textSecondary">
            {show.episode_count} 集 · {show.transcript_count} 篇文字稿
          </ThemedText>
        </View>
      </View>
      {show.description ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={4}>
          {show.description}
        </ThemedText>
      ) : null}
      {show.source_limited ? (
        <ThemedText type="small" themeColor="textSecondary">
          注:该节目未匹配到标准 RSS,可获取的单集范围有限。
        </ThemedText>
      ) : null}
      <ThemedText type="smallBold" style={styles.epsTitle}>
        单集
      </ThemedText>
    </View>
  );
}

function EpisodeRow({ episode, onPress }: { episode: PodcastEpisode; onPress: () => void }) {
  const theme = useTheme();
  const showStatus = !!episode.recording_status && episode.recording_status !== 'none';
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <View style={styles.rowMain}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {episode.title}
          </ThemedText>
          <View style={styles.meta}>
            {episode.published_at ? (
              <ThemedText type="small" themeColor="textSecondary">
                {episode.published_at.slice(0, 10)}
              </ThemedText>
            ) : null}
            {episode.duration > 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                {formatTime(episode.duration)}
              </ThemedText>
            ) : null}
            {showStatus ? (
              <ThemedText type="small" themeColor="text">
                {statusLabel(episode.recording_status)}
              </ThemedText>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  header: { gap: Spacing.two, marginBottom: Spacing.one },
  headerTop: { flexDirection: 'row', gap: Spacing.three },
  headerMeta: { flex: 1, gap: Spacing.half, justifyContent: 'center' },
  epsTitle: { marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  rowMain: { flex: 1, gap: Spacing.one },
  meta: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  loadMore: { alignItems: 'center', paddingVertical: Spacing.three },
});
