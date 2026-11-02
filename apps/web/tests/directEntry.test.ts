import assert from 'node:assert/strict';
import test from 'node:test';
import {
  captureDirectEntry,
  directEntryKey,
  invalidateDirectEntry,
  takeDetailAction,
} from '../src/domain/directEntry.ts';

const CODE = '0123456789abcdef';
const SHARE = { hash: `#/detail?type=skill&id=s1&share=${CODE}`, navigationType: 'navigate' };

test('直达：页面新打开就落在详情页', () => {
  assert.equal(directEntryKey(SHARE), 'skill:s1');
  assert.equal(directEntryKey({ ...SHARE, referrer: 'https://chat.example.com/' }), 'skill:s1');
});

test('不算直达：刷新、前进后退、平台内跳转、OAuth 登录回跳、首个路由不是详情页', () => {
  assert.equal(directEntryKey({ ...SHARE, navigationType: 'reload' }), null);
  assert.equal(directEntryKey({ ...SHARE, navigationType: 'back_forward' }), null);
  assert.equal(directEntryKey({ ...SHARE, navigationType: undefined }), null);
  assert.equal(directEntryKey({ ...SHARE, fromApp: true }), null);
  assert.equal(directEntryKey({ ...SHARE, referrer: 'https://mss.example.com/oauth/callback?code=x&state=y' }), null);
  assert.equal(directEntryKey({ hash: '#/market-projects', navigationType: 'navigate' }), null);
  assert.equal(directEntryKey({ hash: `#/detail?id=s1&share=${CODE}`, navigationType: 'navigate' }), null);
});

test('不算直达：书签、新标签、手输地址没有分享编号；编号格式不对也不算', () => {
  assert.equal(directEntryKey({ hash: '#/detail?type=skill&id=s1', navigationType: 'navigate' }), null);
  assert.equal(directEntryKey({ hash: '#/market-tool?id=t1', navigationType: 'navigate' }), null);
  assert.equal(directEntryKey({ hash: '#/detail?type=skill&id=s1&share=abc', navigationType: 'navigate' }), null);
});

test('同一次打开只记一条：直达只出一次，之后同一资产记 detail', () => {
  captureDirectEntry(SHARE);
  assert.deepEqual(takeDetailAction('skill', 's1'), { action: 'detail_direct', shareCode: CODE });
  assert.deepEqual(takeDetailAction('skill', 's1'), { action: 'detail' });
});

test('直达目标之外的详情记 detail，并让直达作废', () => {
  captureDirectEntry(SHARE);
  assert.deepEqual(takeDetailAction('agent', 'a1'), { action: 'detail' });
  assert.deepEqual(takeDetailAction('skill', 's1'), { action: 'detail' });
});

test('落地后发生过路由跳转（离开再回来、平台内打开）就不再算直达', () => {
  captureDirectEntry(SHARE);
  invalidateDirectEntry();
  assert.deepEqual(takeDetailAction('skill', 's1'), { action: 'detail' });
});
