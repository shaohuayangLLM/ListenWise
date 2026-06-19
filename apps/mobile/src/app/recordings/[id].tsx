import { useQuery } from '@tanstack/react-query';
import { setAudioModeAsync, useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

import { AudioPlayerBar } from '@/components/audio-player-bar';
import { ErrorView, LoadingView } from '@/components/states';
import { SummaryView } from '@/components/summary-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { TranscriptList } from '@/components/transcript-list';
import { Spacing } from '@/constants/theme';
import { Api } from '@/lib/api';
import { activeSegmentIndex, normalizeSegments } from '@/lib/format';
import { mediaUrl } from '@/lib/media';
import type { Recording, Transcript } from '@/lib/types';

const ACCENT = '#c96442';
const RATES = [1, 1.25, 1.5, 2];

export default function RecordingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const rid = Number(id);
  const valid = Number.isFinite(rid);

  const recQ = useQuery({ queryKey: ['recording', rid], queryFn: () => Api.getRecording(rid), enabled: valid });
  const trQ = useQuery({ queryKey: ['transcript', rid], queryFn: () => Api.getTranscript(rid), enabled: valid });

  const loading = recQ.isLoading || trQ.isLoading;
  const err = recQ.error || trQ.error;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: recQ.data?.title ?? '文字稿' }} />
      {loading ? (
        <LoadingView />
      ) : err || !recQ.data || !trQ.data ? (
        <ErrorView
          message={(err as Error)?.message ?? '文字稿尚未就绪'}
          onRetry={() => {
            recQ.refetch();
            trQ.refetch();
          }}
        />
      ) : (
        <Reader recording={recQ.data} transcript={trQ.data} />
      )}
    </ThemedView>
  );
}

function Reader({ recording, transcript }: { recording: Recording; transcript: Transcript }) {
  const audioUri = mediaUrl(recording.file_url);
  const source = useMemo(() => ({ uri: audioUri }), [audioUri]);
  const player = useAudioPlayer(source, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);

  const [tab, setTab] = useState<'transcript' | 'summary'>('transcript');
  const [rateIdx, setRateIdx] = useState(0);

  const segments = useMemo(() => normalizeSegments(transcript.segments), [transcript.segments]);
  const currentTime = status?.currentTime ?? 0;
  const duration = status?.duration || recording.duration || 0;
  const playing = status?.playing ?? false;
  const activeIdx = useMemo(() => activeSegmentIndex(segments, currentTime), [segments, currentTime]);

  useEffect(() => {
    // iOS 静音键下也能出声。
    setAudioModeAsync({ playsInSilentMode: true }).catch(() => {});
  }, []);

  const togglePlay = useCallback(() => {
    if (playing) player.pause();
    else player.play();
  }, [playing, player]);

  const cycleRate = useCallback(() => {
    const next = (rateIdx + 1) % RATES.length;
    setRateIdx(next);
    player.setPlaybackRate(RATES[next]);
  }, [rateIdx, player]);

  const seek = useCallback(
    (sec: number) => {
      player.seekTo(sec);
      if (!playing) player.play();
    },
    [player, playing],
  );

  return (
    <View style={styles.flex}>
      <View style={styles.tabs}>
        <TabBtn label="文字稿" active={tab === 'transcript'} onPress={() => setTab('transcript')} />
        <TabBtn label="AI 解读" active={tab === 'summary'} onPress={() => setTab('summary')} />
      </View>

      <View style={styles.flex}>
        {tab === 'transcript' ? (
          <TranscriptList
            segments={segments}
            speakerLabels={transcript.speaker_labels ?? {}}
            activeIndex={activeIdx}
            isPlaying={playing}
            onSeek={seek}
          />
        ) : (
          <SummaryView summary={transcript.summary} outline={transcript.outline ?? []} onSeek={seek} />
        )}
      </View>

      <AudioPlayerBar
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        rate={RATES[rateIdx]}
        onTogglePlay={togglePlay}
        onCycleRate={cycleRate}
      />
    </View>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.tab, active ? styles.tabActive : null]} activeOpacity={0.7}>
      <ThemedText type="smallBold" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  tabs: { flexDirection: 'row', gap: Spacing.three, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  tab: { paddingVertical: Spacing.one },
  tabActive: { borderBottomWidth: 2, borderBottomColor: ACCENT },
});
