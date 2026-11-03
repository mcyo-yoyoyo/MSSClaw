import assert from 'node:assert/strict';
import test from 'node:test';
import {
  EMPLOYEE_ASSISTANT_TOOL_ID,
  isEmployeeAssistantTool,
  launchEmployeeAssistant,
} from '../src/domain/employeeAssistantLaunch.ts';

test('只有员工助手走本地唤起', () => {
  assert.equal(isEmployeeAssistantTool(EMPLOYEE_ASSISTANT_TOOL_ID), true);
  assert.equal(isEmployeeAssistantTool('tool-hw-cloudnote'), false);
});

test('两秒内页面仍在前台时打开下载页', async () => {
  const opened: string[] = [];
  const notes: string[] = [];
  const frames: Array<{ src: string; removed: boolean }> = [];
  const listeners = new Map<string, () => void>();

  Object.assign(globalThis, {
    document: {
      hidden: false,
      createElement() {
        const frame = {
          style: { display: '' },
          src: '',
          removed: false,
          remove() {
            frame.removed = true;
          },
        };
        return frame;
      },
      body: {
        appendChild(frame: { src: string; removed: boolean }) {
          frames.push(frame);
        },
      },
    },
    window: {
      addEventListener(type: string, listener: () => void) {
        listeners.set(type, listener);
      },
      removeEventListener(type: string) {
        listeners.delete(type);
      },
      setTimeout,
      clearTimeout,
      open(url: string) {
        opened.push(url);
        return {};
      },
    },
  });

  launchEmployeeAssistant({
    name: '员工助手',
    fallbackUrl: 'https://download.example/assistant',
    notify: (message) => notes.push(message),
  });

  assert.equal(frames[0]?.src, 'weclaw://');
  assert.deepEqual(notes, ['正在打开：员工助手']);
  await new Promise((resolve) => setTimeout(resolve, 2100));
  assert.equal(frames[0]?.removed, true);
  assert.deepEqual(opened, ['https://download.example/assistant']);
  assert.equal(notes[1], '未检测到员工助手桌面端，正在打开下载页…');
});
