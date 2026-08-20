import assert from 'node:assert/strict';
import test from 'node:test';
import { isApprovalSuccessNotification } from '../src/domain/inbox.ts';

const approvalMessage = (title: string, fromName = 'MSS 质量与运营') => ({
  kind: 'system' as const,
  title,
  fromName,
});

test('recognizes legacy approval-success notifications', () => {
  for (const title of ['上架审批已通过', '更新上架审批已通过', '下架审批已通过']) {
    assert.equal(isApprovalSuccessNotification(approvalMessage(title)), true);
  }
});

test('keeps rejection and unrelated system notifications visible', () => {
  assert.equal(isApprovalSuccessNotification(approvalMessage('上架审批已驳回', '审批中心')), false);
  assert.equal(isApprovalSuccessNotification(approvalMessage('功能上线：三货架与 MSS 工具集市')), false);
  assert.equal(isApprovalSuccessNotification(approvalMessage('上架审批已通过', '其他系统')), false);
});
