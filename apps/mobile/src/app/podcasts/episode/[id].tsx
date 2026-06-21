import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';

import { ErrorView, LoadingView } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { Api } from '@/lib/api';
import { isTerminalStatus } from '@/lib/format';

const ACCENT = '#c96442';
const IN_PROGRESS = ['uploading', 'processing', 'transcribing'];

export default function EpisodeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const eid = Number(id);
  const valid = Number.isFinite(eid);
  const router = useRouter();
  const qc = useQueryClient();

  const epQ = useQuery({
    queryKey: ['episode', eid],
    queryFn: () => Api.getEpisode(eid),
    enabled: valid,
    // 转写中每 4s 轮询一次;到终态(done/failed)停止。
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d || d.recording_id == null) return false;
      return isTerminalStatus(d.recording_status) ? false : 4000;
    },
  });

  const transM = useMutation({
    mutationFn: () => Api.transcribeEpisode(eid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['episode', eid] }),
    onError: (e) => Alert.alert('操作失败', (e as Error).message),
  });

  if (epQ.isLoading) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: '单集' }} />
        <LoadingView />
      </ThemedView>
    );
  }
  if (epQ.isError || !epQ.data) {
    return (
      <ThemedView style={styles.flex}>
        <Stack.Screen options={{ title: '单集' }} />
        <ErrorView message={(epQ.error as Error)?.message} onRetry={() => epQ.refetch()} />
      </ThemedView>
    );
  }

  const ep = epQ.data;
  const status = ep.recording_status;
  const recordingId = ep.recording_id;
  const isDone = recordingId != null && status === 'done';
  const isFailed = status === 'failed';
  const inProgress = recordingId != null && IN_PROGRESS.includes(status);
  const shownotes = ep.shownotes_text || ep.description || '';

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: ep.show_title ?? '单集' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="subtitle">{ep.title}</ThemedText>
        {ep.published_at ? (
          <ThemedText type="small" themeColor="textSecondary">
            {ep.published_at.slice(0, 10)}
          </ThemedText>
        ) : null}

        {isDone && recordingId != null ? (
          <PrimaryButton label="查看文字稿" onPress={() => router.push(`/recordings/${recordingId}`)} />
        ) : inProgress ? (
          <View style={styles.statusRow}>
            <ActivityIndicator color={ACCENT} />
            <ThemedText type="small" themeColor="textSecondary">
              转写中,完成后自动显示…
            </ThemedText>
          </View>
        ) : isFailed ? (
          <View style={styles.statusCol}>
            <ThemedText type="small" themeColor="textSecondary">
              转写失败
            </ThemedText>
            <PrimaryButton label="重试" onPress={() => transM.mutate()} pending={transM.isPending} />
          </View>
        ) : ep.audio_url_available ? (
          <PrimaryButton label="获取文字稿" onPress={() => transM.mutate()} pending={transM.isPending} />
        ) : (
          <ThemedText type="small" themeColor="textSecondary">
            该单集音频不可获取,暂不能转写。
          </ThemedText>
        )}

        <ThemedText type="smallBold" style={styles.shTitle}>
          Shownotes
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.shBody}>
          {shownotes || '(暂无)'}
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

function PrimaryButton({ label, onPress, pending }: { label: string; onPress: () => void; pending?: boolean }) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress} disabled={pending} activeOpacity={0.85}>
      {pending ? (
        <ActivityIndicator color="#ffffff" />
      ) : (
        <ThemedText type="smallBold" style={{ color: '#ffffff' }}>
          {label}
        </ThemedText>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.three, gap: Spacing.three },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  statusCol: { gap: Spacing.two, alignItems: 'flex-start' },
  button: { backgroundColor: ACCENT, borderRadius: Spacing.two, paddingVertical: Spacing.three, alignItems: 'center' },
  shTitle: { marginTop: Spacing.two },
  shBody: { lineHeight: 22 },
});
