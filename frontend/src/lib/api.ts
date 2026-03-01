import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export interface UploadRecordingParams {
  file: File;
  title: string;
  scene_type: string;
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
  scene_type: string;
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

export interface StatsResponse {
  total_count: number;
  total_duration: number;
  pending_count: number;
  week_count: number;
}

export async function uploadRecording({
  file,
  title,
  scene_type,
  note,
  onProgress,
}: UploadRecordingParams): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("title", title);
  formData.append("scene_type", scene_type);
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

export interface ProcessingItem {
  id: number;
  title: string;
  scene_type: string;
  status: string;
  progress: number;
  created_at: string;
}

export interface ProcessingListResponse {
  items: ProcessingItem[];
  count: number;
}

export async function getStats(): Promise<StatsResponse> {
  const { data } = await api.get<StatsResponse>("/stats");
  return data;
}

export async function getProcessingRecordings(): Promise<ProcessingListResponse> {
  const { data } = await api.get<ProcessingListResponse>(
    "/recordings/processing"
  );
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

// Document types
export interface DocumentData {
  id: number;
  recording_id: number;
  scene_type: string;
  content: Record<string, unknown>;
  format_version: number;
}

// Recording detail with transcript and document
export interface RecordingDetail extends Recording {
  transcript: Transcript | null;
  document: DocumentData | null;
}

export async function getRecordingDetail(
  id: number
): Promise<RecordingDetail> {
  // Fetch recording, transcript, and document in parallel
  const [recordingRes, transcriptRes, documentRes] = await Promise.allSettled([
    api.get<Recording>(`/recordings/${id}`),
    api.get<Transcript>(`/recordings/${id}/transcript`),
    api.get<DocumentData>(`/recordings/${id}/document`),
  ]);

  if (recordingRes.status === "rejected") {
    throw new Error("Failed to load recording");
  }

  const recording = recordingRes.value.data;
  const transcript =
    transcriptRes.status === "fulfilled" ? transcriptRes.value.data : null;
  const document =
    documentRes.status === "fulfilled" ? documentRes.value.data : null;

  return { ...recording, transcript, document };
}

// Folder types
export interface Folder {
  id: number;
  name: string;
  parent_id: number | null;
  children: Folder[];
  recording_count: number;
}

export async function getFolders(): Promise<Folder[]> {
  const { data } = await api.get<Folder[]>("/folders");
  return data;
}

export async function createFolder(name: string, parentId?: number): Promise<Folder> {
  const { data } = await api.post<Folder>("/folders", {
    name,
    parent_id: parentId ?? null,
  });
  return data;
}

// Tag types
export interface Tag {
  id: number;
  name: string;
}

export async function getTags(): Promise<Tag[]> {
  const { data } = await api.get<Tag[]>("/tags");
  return data;
}

export async function getRecordingsByFolder(
  folderId: number | null,
  page = 1,
  pageSize = 100
): Promise<RecordingListResponse> {
  const params: Record<string, unknown> = { page, page_size: pageSize };
  if (folderId !== null) params.folder_id = folderId;
  const { data } = await api.get<RecordingListResponse>("/recordings", { params });
  return data;
}
