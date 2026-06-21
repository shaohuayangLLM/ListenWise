// 纯函数:时间格式化、说话人名映射、状态文案、segment 归一化。
// 这些不依赖 React Native,可在 Node 下单测(见 __tests__/format.test.ts)。

import type { TranscriptSegment } from './types';

/** 秒 -> "M:SS"(超过 1 小时为 "H:MM:SS")。负数/NaN 归零。 */
export function formatTime(totalSeconds: number): string {
  let t = totalSeconds;
  if (!Number.isFinite(t) || t < 0) t = 0;
  const s = Math.floor(t % 60);
  const m = Math.floor((t / 60) % 60);
  const h = Math.floor(t / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

/** 把 ASR 的说话人标记(A/B/C)映射成真名;无映射时原样返回。 */
export function speakerName(speaker: string, labels?: Record<string, string>): string {
  if (!speaker) return '';
  return labels?.[speaker] ?? speaker;
}

/** 转写/记录状态的中文文案。 */
export function statusLabel(status: string): string {
  switch (status) {
    case 'uploading':
      return '上传中';
    case 'processing':
      return '处理中';
    case 'transcribing':
      return '转写中';
    case 'done':
      return '已完成';
    case 'failed':
      return '失败';
    default:
      return status || '未知';
  }
}

/** 终态:done / failed。轮询到终态即停。 */
export function isTerminalStatus(status: string): boolean {
  return status === 'done' || status === 'failed';
}

/** 归一化文字稿 segment:过滤空文本、数值兜底、按开始时间排序。 */
export function normalizeSegments(segments: TranscriptSegment[] | null | undefined): TranscriptSegment[] {
  if (!Array.isArray(segments)) return [];
  return segments
    .filter((s) => s && typeof s.text === 'string' && s.text.trim().length > 0)
    .map((s) => ({
      start: Number.isFinite(s.start) ? s.start : 0,
      end: Number.isFinite(s.end) ? s.end : 0,
      speaker: s.speaker ?? '',
      text: s.text.trim(),
    }))
    .sort((a, b) => a.start - b.start);
}

/** 在已排序的 segments 里,找出当前播放时间所在句的下标;找不到返回 -1。 */
export function activeSegmentIndex(segments: TranscriptSegment[], currentSec: number): number {
  if (!segments.length) return -1;
  let lo = 0;
  let hi = segments.length - 1;
  let ans = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (segments[mid].start <= currentSec) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  // ans 是最后一个 start <= currentSec 的句子;若它已经结束且有间隙,仍高亮它(更接近播放器直觉)。
  return ans;
}
