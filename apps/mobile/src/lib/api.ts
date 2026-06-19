// 薄 api client:fetch 封装 baseURL + 访问口令头 + 401 处理。只暴露 Phase 0 用到的端点。
// 不抽共享包(YAGNI):Web 与 App 暂不复用同一份 client。

import { getApiBase, getPasscode, handleUnauthorized } from './session';
import type {
  PodcastEpisode,
  PodcastEpisodeDetail,
  PodcastRefreshResult,
  PodcastSearchResult,
  PodcastShow,
  Recording,
  RecordingListResponse,
  Transcript,
} from './types';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };
  const pc = getPasscode();
  if (pc) headers['X-Access-Passcode'] = pc;

  let res: Response;
  try {
    res = await fetch(getApiBase() + path, { ...init, headers });
  } catch {
    throw new ApiError('网络请求失败,请检查网络或后端地址', 0);
  }

  if (res.status === 401) {
    handleUnauthorized();
    throw new ApiError('访问口令无效,请重新输入', 401);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ApiError(text || `请求失败(${res.status})`, res.status);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const qs = (params: Record<string, string | number | undefined>): string => {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return pairs.length ? `?${pairs.join('&')}` : '';
};

export const Api = {
  // ---- 播客:发现/订阅 ----
  searchPodcasts: (q: string) => req<PodcastSearchResult[]>(`/podcasts/search${qs({ q })}`),
  subscribePodcast: (url: string) =>
    req<PodcastShow>('/podcasts/shows', { method: 'POST', body: JSON.stringify({ url }) }),
  getShows: () => req<PodcastShow[]>('/podcasts/shows'),
  getShow: (id: number) => req<PodcastShow>(`/podcasts/shows/${id}`),
  refreshShow: (id: number) =>
    req<PodcastRefreshResult>(`/podcasts/shows/${id}/refresh`, { method: 'POST' }),
  loadMoreEpisodes: (id: number) =>
    req<PodcastRefreshResult>(`/podcasts/shows/${id}/load-more`, { method: 'POST' }),

  // ---- 播客:单集 ----
  getEpisodes: (showId?: number) => req<PodcastEpisode[]>(`/podcasts/episodes${qs({ show_id: showId })}`),
  getEpisode: (id: number) => req<PodcastEpisodeDetail>(`/podcasts/episodes/${id}`),
  transcribeEpisode: (id: number) =>
    req<{ recording_id: number; status: string }>(`/podcasts/episodes/${id}/transcribe`, {
      method: 'POST',
    }),

  // ---- 转写记录 ----
  getRecordings: (page = 1, pageSize = 20) =>
    req<RecordingListResponse>(`/recordings${qs({ page, page_size: pageSize })}`),
  getRecording: (id: number) => req<Recording>(`/recordings/${id}`),
  getTranscript: (id: number) => req<Transcript>(`/recordings/${id}/transcript`),
};
