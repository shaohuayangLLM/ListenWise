import { getApiBase } from './session';

// 音频地址解析:播客单集是 http 外链直接用;本地上传文件拼到后端 /uploads。
// 与 Web 端 frontend/src/lib/api.ts 的 mediaUrl 一致。
export function mediaUrl(fileUrl: string | null | undefined): string {
  if (!fileUrl) return '';
  if (/^https?:\/\//.test(fileUrl)) return fileUrl;
  const base = getApiBase().replace(/\/api$/, '');
  return base + fileUrl.replace(/^\/app\/uploads\//, '/uploads/');
}
