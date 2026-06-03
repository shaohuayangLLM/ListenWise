import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

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

export interface Transcript {
  id: number;
  recording_id: number;
  segments: TranscriptSegment[];
  full_text: string;
  word_count: number;
}

// Recording detail with transcript
export interface RecordingDetail extends Recording {
  transcript: Transcript | null;
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
