// 后端数据类型(从 Web frontend/src/lib/api.ts 拷来,Phase 0 播客阅读链路用到的子集)。

export interface TranscriptSegment {
  start: number;
  end: number;
  speaker: string;
  text: string;
}

export interface OutlineItem {
  title: string;
  start_sec: number;
  points: string[];
}

export interface HighlightItem {
  quote: string;
  start_sec: number;
  speaker?: string;
}

export interface KeywordItem {
  term: string;
  explanation: string;
}

export interface Transcript {
  id: number;
  recording_id: number;
  segments: TranscriptSegment[];
  full_text: string;
  word_count: number;
  speaker_labels: Record<string, string>;
  summary: string | null;
  outline: OutlineItem[];
  highlights: HighlightItem[];
  keywords: KeywordItem[];
  summary_model: string | null;
  summary_at: string | null;
  corrected_at: string | null;
  correction_model: string | null;
  can_revert_correction: boolean;
}

export interface Recording {
  id: number;
  title: string;
  status: string;
  source: 'upload' | 'podcast' | 'realtime';
  file_url: string;
  original_filename: string;
  duration: number;
  file_size: number;
  note: string | null;
  speaker_count: number;
  folder_id: number | null;
  is_favorite: boolean;
  progress: number;
  created_at: string;
  updated_at: string;
}

export interface RecordingListResponse {
  items: Recording[];
  total: number;
  page: number;
  page_size: number;
}

export interface PodcastShow {
  id: number;
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  source_type: string;
  source_url: string;
  feed_url: string | null;
  is_subscribed: boolean;
  source_limited: boolean;
  last_sync_message: string | null;
  last_synced_at: string | null;
  episode_count: number;
  transcript_count: number;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisode {
  id: number;
  show_id: number | null;
  show_title: string | null;
  recording_id: number | null;
  recording_status: string;
  title: string;
  description: string | null;
  shownotes_text: string | null;
  episode_url: string | null;
  audio_url_available: boolean;
  cover_url: string | null;
  published_at: string | null;
  duration: number;
  suggested_show_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisodeDetail extends PodcastEpisode {
  transcript: Transcript | null;
}

export interface PodcastSearchResult {
  source_type: 'podcast' | 'youtube_video';
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  feed_url: string | null;
  source_url: string | null;
  episode_count: number | null;
  source_label: string | null;
  published_at: string | null;
  subscribed_show_id: number | null;
}

export interface PodcastRefreshResult {
  show_id: number;
  title: string;
  added: number;
  updated: number;
  message: string | null;
  error: string | null;
}
