import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Cover } from '@/components/cover';
import { EmptyView, LoadingView } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Api } from '@/lib/api';
import type { PodcastSearchResult, PodcastShow } from '@/lib/types';

const ACCENT = '#c96442';

export default function PodcastsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');

  const showsQ = useQuery({ queryKey: ['shows'], queryFn: Api.getShows });
  const searchM = useMutation({ mutationFn: (q: string) => Api.searchPodcasts(q) });
  const subM = useMutation({
    mutationFn: (url: string) => Api.subscribePodcast(url),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shows'] });
      searchM.reset();
      setQuery('');
      Alert.alert('已订阅', '已同步该节目最近的单集');
    },
    onError: (e) => Alert.alert('订阅失败', (e as Error).message),
  });

  const onSearch = () => {
    const q = query.trim();
    if (q) searchM.mutate(q);
  };

  // Phase 0 聚焦播客,过滤掉 YouTube 视频结果。
  const results = (searchM.data ?? []).filter((r) => r.source_type === 'podcast');

  return (
    <ThemedView style={styles.flex}>
      <FlatList
        data={showsQ.data ?? []}
        keyExtractor={(s) => String(s.id)}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={showsQ.isFetching} onRefresh={() => showsQ.refetch()} tintColor={theme.text} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.searchRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="搜索节目,或粘贴 RSS / 小宇宙链接"
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, borderColor: theme.backgroundSelected }]}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="search"
                onSubmitEditing={onSearch}
              />
              <TouchableOpacity style={styles.searchBtn} onPress={onSearch} activeOpacity={0.8}>
                {searchM.isPending ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <ThemedText type="smallBold" style={styles.searchBtnText}>
                    搜索
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>

            {searchM.isError ? (
              <ThemedText type="small" themeColor="textSecondary">
                搜索失败:{(searchM.error as Error).message}
              </ThemedText>
            ) : null}

            {results.length > 0 ? (
              <View style={styles.results}>
                <ThemedText type="small" themeColor="textSecondary">
                  搜索结果
                </ThemedText>
                {results.map((r, i) => (
                  <SearchResultRow
                    key={r.source_url ?? r.feed_url ?? String(i)}
                    result={r}
                    subscribing={subM.isPending}
                    onSubscribe={() => {
                      const url = r.source_url ?? r.feed_url;
                      if (url) subM.mutate(url);
                      else Alert.alert('无法订阅', '该结果缺少可订阅链接');
                    }}
                  />
                ))}
              </View>
            ) : null}

            <ThemedText type="smallBold" style={styles.subsTitle}>
              已订阅
            </ThemedText>
          </View>
        }
        ListEmptyComponent={
          showsQ.isLoading ? <LoadingView /> : <EmptyView message="还没订阅节目,上方搜索添加。" />
        }
        renderItem={({ item }: { item: PodcastShow }) => (
          <ShowRow show={item} onPress={() => router.push(`/podcasts/${item.id}`)} />
        )}
      />
    </ThemedView>
  );
}

function ShowRow({ show, onPress }: { show: PodcastShow; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <ThemedView type="backgroundElement" style={styles.row}>
        <Cover uri={show.cover_url} />
        <View style={styles.rowMain}>
          <ThemedText type="smallBold" numberOfLines={1}>
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
        <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
      </ThemedView>
    </TouchableOpacity>
  );
}

function SearchResultRow({
  result,
  onSubscribe,
  subscribing,
}: {
  result: PodcastSearchResult;
  onSubscribe: () => void;
  subscribing: boolean;
}) {
  const subscribed = result.subscribed_show_id != null;
  return (
    <ThemedView type="backgroundElement" style={styles.row}>
      <Cover uri={result.cover_url} />
      <View style={styles.rowMain}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {result.title}
        </ThemedText>
        {result.author ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {result.author}
          </ThemedText>
        ) : null}
        {result.source_label ? (
          <ThemedText type="small" themeColor="textSecondary">
            {result.source_label}
          </ThemedText>
        ) : null}
      </View>
      {subscribed ? (
        <ThemedText type="small" themeColor="textSecondary">
          已订阅
        </ThemedText>
      ) : (
        <TouchableOpacity style={styles.subBtn} onPress={onSubscribe} disabled={subscribing} activeOpacity={0.8}>
          <ThemedText type="smallBold" style={styles.subBtnText}>
            订阅
          </ThemedText>
        </TouchableOpacity>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.two },
  header: { gap: Spacing.three, marginBottom: Spacing.one },
  searchRow: { flexDirection: 'row', gap: Spacing.two },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.four,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: { color: '#ffffff' },
  results: { gap: Spacing.two },
  subsTitle: { marginTop: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    borderRadius: Spacing.three,
  },
  rowMain: { flex: 1, gap: Spacing.half },
  subBtn: {
    backgroundColor: ACCENT,
    borderRadius: Spacing.two,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
  subBtnText: { color: '#ffffff' },
});
