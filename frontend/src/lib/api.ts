import axios from "axios";

// 生产：直连 Render 后端（绕开 Vercel 代理的 body 大小限制）。
// 本地：留空走 /api，由 Next rewrites 代理到本地后端。
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "/api";
export const PASSCODE_KEY = "lw_passcode";

// 媒体（音频）地址：播客是 http 外链直接用；本地上传文件拼到后端 /uploads。
const MEDIA_BASE = API_BASE.replace(/\/api$/, "");
export function mediaUrl(fileUrl: string): string {
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  return MEDIA_BASE + fileUrl.replace(/^\/app\/uploads\//, "/uploads/");
}

const api = axios.create({
  baseURL: API_BASE,
});

// 请求自动带上访问口令；响应 401 时清除口令并回到口令门。
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const pc = localStorage.getItem(PASSCODE_KEY);
    if (pc) config.headers["X-Access-Passcode"] = pc;
  }
  return config;
});

api.interceptors.response.use(
  (resp) => resp,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem(PASSCODE_KEY);
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export interface UploadRecordingParams {
  file: File;
  title: string;
  note?: string;
  onProgress?: (percent: number) => void;
}

export interface UploadResponse {
  id: number;
  status: string;
  message: string;
}

export interface Recording {
  id: number;
  title: string;
  status: string;
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

export async function uploadRecording({
  file,
  title,
  note,
  onProgress,
}: UploadRecordingParams): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  if (note) formData.append("note", note);

  const { data } = await api.post<UploadResponse>(
    "/recordings/upload",
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (e) => {
        if (e.total && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    }
  );
  return data;
}

export async function getRecording(id: number): Promise<Recording> {
  const { data } = await api.get<Recording>(`/recordings/${id}`);
  return data;
}

export async function updateRecording(
  id: number,
  body: { title?: string; is_favorite?: boolean }
): Promise<Recording> {
  const { data } = await api.patch<Recording>(`/recordings/${id}`, body);
  return data;
}

export async function deleteRecording(id: number): Promise<void> {
  await api.delete(`/recordings/${id}`);
}

export async function exportRecordingToObsidian(
  id: number
): Promise<{ path: string; relative_path: string }> {
  const { data } = await api.post<{ path: string; relative_path: string }>(
    `/recordings/${id}/export/obsidian`
  );
  return data;
}

export async function exportTranscript(
  id: number,
  format: string,
  filename: string
): Promise<void> {
  const resp = await api.get(`/recordings/${id}/export`, {
    params: { format },
    responseType: "blob",
  });
  const url = URL.createObjectURL(resp.data as Blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function getRecordings(
  page = 1,
  pageSize = 20
): Promise<RecordingListResponse> {
  const { data } = await api.get<RecordingListResponse>("/recordings", {
    params: { page, page_size: pageSize },
  });
  return data;
}

// Transcript types
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
}

// Recording detail with transcript
export interface RecordingDetail extends Recording {
  transcript: Transcript | null;
}

export interface SummaryResult {
  summary: string | null;
  outline: OutlineItem[];
  summary_model: string | null;
  summary_at: string | null;
}

export async function regenerateSummary(id: number): Promise<SummaryResult> {
  const { data } = await api.post<SummaryResult>(`/recordings/${id}/summary`);
  return data;
}

export async function getRecordingDetail(
  id: number
): Promise<RecordingDetail> {
  // Fetch recording and transcript in parallel.
  const [recordingRes, transcriptRes] = await Promise.allSettled([
    api.get<Recording>(`/recordings/${id}`),
    api.get<Transcript>(`/recordings/${id}/transcript`),
  ]);

  if (recordingRes.status === "rejected") {
    throw new Error("Failed to load recording");
  }

  const recording = recordingRes.value.data;
  const transcript =
    transcriptRes.status === "fulfilled" ? transcriptRes.value.data : null;

  return { ...recording, transcript };
}

// ===== 模型设置（Provider 配置）=====
export interface ProviderConfig {
  capability: string;
  provider: string;
  model: string;
  base_url: string | null;
  enabled: boolean;
  api_key_masked: string;
  configured: boolean;
}

export interface ProviderConfigUpdate {
  provider: string;
  model: string;
  api_key?: string | null;
  base_url?: string | null;
  enabled?: boolean;
}

export async function getProviders(): Promise<ProviderConfig[]> {
  const { data } = await api.get<ProviderConfig[]>("/settings/providers");
  return data;
}

export async function updateProvider(
  capability: string,
  body: ProviderConfigUpdate
): Promise<ProviderConfig> {
  const { data } = await api.put<ProviderConfig>(
    `/settings/providers/${capability}`,
    body
  );
  return data;
}

export async function testProvider(
  capability: string
): Promise<{ ok: boolean; message: string }> {
  const { data } = await api.post(`/settings/providers/${capability}/test`);
  return data;
}

// ===== 播客节目与单集目录 =====
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

export interface PodcastRefreshResult {
  show_id: number;
  title: string;
  added: number;
  updated: number;
  message: string | null;
  error: string | null;
}

export interface PodcastSearchResult {
  source_type: "podcast" | "youtube_video";
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

export interface PodcastPreviewShow {
  title: string;
  author: string | null;
  description: string | null;
  cover_url: string | null;
  source_type: string;
  source_url: string;
  feed_url: string | null;
  source_limited: boolean;
  sync_message: string | null;
  total_available: number;
  subscribed_show_id: number | null;
}

export interface PodcastPreviewEpisode {
  title: string;
  description: string | null;
  shownotes_text: string | null;
  episode_url: string | null;
  audio_url_available: boolean;
  cover_url: string | null;
  published_at: string | null;
  duration: number;
}

export interface PodcastPreview {
  show: PodcastPreviewShow;
  episodes: PodcastPreviewEpisode[];
}

export async function getPodcastShows(): Promise<PodcastShow[]> {
  const { data } = await api.get<PodcastShow[]>("/podcasts/shows");
  return data;
}

export async function searchPodcastShows(
  q: string
): Promise<PodcastSearchResult[]> {
  const { data } = await api.get<PodcastSearchResult[]>("/podcasts/search", {
    params: { q },
  });
  return data;
}

export async function previewPodcastShow(url: string): Promise<PodcastPreview> {
  const { data } = await api.get<PodcastPreview>("/podcasts/preview", {
    params: { url },
  });
  return data;
}

export async function subscribePodcastShow(url: string): Promise<PodcastShow> {
  const { data } = await api.post<PodcastShow>("/podcasts/shows", { url });
  return data;
}

export async function refreshPodcastShows(): Promise<PodcastRefreshResult[]> {
  const { data } = await api.post<PodcastRefreshResult[]>("/podcasts/shows/refresh");
  return data;
}

export async function getPodcastShow(id: number): Promise<PodcastShow> {
  const { data } = await api.get<PodcastShow>(`/podcasts/shows/${id}`);
  return data;
}

export async function refreshPodcastShow(id: number): Promise<PodcastRefreshResult> {
  const { data } = await api.post<PodcastRefreshResult>(`/podcasts/shows/${id}/refresh`);
  return data;
}

export async function loadMorePodcastEpisodes(id: number): Promise<PodcastRefreshResult> {
  const { data } = await api.post<PodcastRefreshResult>(`/podcasts/shows/${id}/load-more`);
  return data;
}

export async function unsubscribePodcastShow(id: number): Promise<void> {
  await api.post(`/podcasts/shows/${id}/unsubscribe`);
}

export async function deletePodcastShow(id: number): Promise<void> {
  await api.delete(`/podcasts/shows/${id}`);
}

export async function getPodcastEpisodes(showId?: number): Promise<PodcastEpisode[]> {
  const { data } = await api.get<PodcastEpisode[]>("/podcasts/episodes", {
    params: showId ? { show_id: showId } : undefined,
  });
  return data;
}

export async function importPodcastEpisode(
  url: string,
  title?: string
): Promise<PodcastEpisode> {
  const { data } = await api.post<PodcastEpisode>("/podcasts/episodes", { url, title });
  return data;
}

export async function getPodcastEpisode(id: number): Promise<PodcastEpisodeDetail> {
  const { data } = await api.get<PodcastEpisodeDetail>(`/podcasts/episodes/${id}`);
  return data;
}

export async function transcribePodcastEpisode(
  id: number
): Promise<{ recording_id: number; status: string }> {
  const { data } = await api.post(`/podcasts/episodes/${id}/transcribe`);
  return data;
}

export async function batchTranscribePodcastEpisodes(
  episodeIds: number[]
): Promise<{
  started: number;
  recording_ids: number[];
  skipped: { episode_id: number; reason: string }[];
}> {
  const { data } = await api.post("/podcasts/episodes/batch-transcribe", {
    episode_ids: episodeIds,
  });
  return data;
}
