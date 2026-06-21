import assert from 'node:assert/strict';
import test from 'node:test';

import { activeSegmentIndex, formatTime, isTerminalStatus, normalizeSegments, speakerName, statusLabel } from './format.ts';

test('formatTime', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5), '0:05');
  assert.equal(formatTime(65), '1:05');
  assert.equal(formatTime(3661), '1:01:01');
  assert.equal(formatTime(-5), '0:00');
  assert.equal(formatTime(NaN), '0:00');
});

test('speakerName 映射真名,无映射原样返回', () => {
  assert.equal(speakerName('A', { A: '徐涛' }), '徐涛');
  assert.equal(speakerName('B', { A: '徐涛' }), 'B');
  assert.equal(speakerName('A', undefined), 'A');
  assert.equal(speakerName('', { A: '徐涛' }), '');
});

test('statusLabel / isTerminalStatus', () => {
  assert.equal(statusLabel('transcribing'), '转写中');
  assert.equal(statusLabel('done'), '已完成');
  assert.equal(statusLabel('failed'), '失败');
  assert.equal(isTerminalStatus('done'), true);
  assert.equal(isTerminalStatus('failed'), true);
  assert.equal(isTerminalStatus('transcribing'), false);
});

test('normalizeSegments 过滤空文本、数值兜底、按开始时间排序', () => {
  const input = [
    { start: 10, end: 12, speaker: 'A', text: ' 第二句 ' },
    { start: 0, end: 2, speaker: 'A', text: '第一句' },
    { start: 5, end: 6, speaker: 'B', text: '   ' }, // 空白,应过滤
    { start: Number.NaN, end: 3, speaker: 'A', text: '坏时间' },
  ];
  const out = normalizeSegments(input);
  assert.equal(out.length, 3);
  assert.equal(out[0].start, 0); // NaN(兜底为0)与 0 排前
  assert.equal(out[0].text, '第一句');
  assert.equal(out[2].text, '第二句'); // 已 trim
});

test('normalizeSegments 容错 null', () => {
  assert.deepEqual(normalizeSegments(null), []);
  assert.deepEqual(normalizeSegments(undefined), []);
});

test('activeSegmentIndex 二分定位当前句', () => {
  const segs = normalizeSegments([
    { start: 0, end: 10, speaker: 'A', text: 'a' },
    { start: 10, end: 20, speaker: 'A', text: 'b' },
    { start: 20, end: 30, speaker: 'A', text: 'c' },
  ]);
  assert.equal(activeSegmentIndex(segs, 5), 0);
  assert.equal(activeSegmentIndex(segs, 10), 1);
  assert.equal(activeSegmentIndex(segs, 25), 2);
  assert.equal(activeSegmentIndex(segs, 100), 2);
  assert.equal(activeSegmentIndex([], 5), -1);
});
