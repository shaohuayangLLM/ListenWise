import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// 大文件上传绕过 Next dev 代理的 10MB body 限制：设置后直连后端。
// 仅 dev 用；生产同域或反代时留空走 /api。
const UPLOAD_BASE = process.env.NEXT_PUBLIC_UPLOAD_BASE || "";

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

  const { data } = await (UPLOAD_BASE ? axios : api).post<UploadResponse>(
    UPLOAD_BASE ? `${UPLOAD_BASE}/api/recordings/upload` : "/recordings/upload",
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

export interface CreatePodcastParams {
  url: string;
  title?: string;
}

export async function createPodcast({
  url,
  title,
}: CreatePodcastParams): Promise<UploadResponse> {
  const { data } = await api.post<UploadResponse>("/podcasts", { url, title });
  return data;
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
