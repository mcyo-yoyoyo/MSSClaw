export type AiBriefEmailRecipientRow = {
  userId: string;
  userName: string;
  email: string;
  subscribedAt: Date;
  updatedAt: Date;
};

function isNewerRecipient(
  candidate: AiBriefEmailRecipientRow,
  current: AiBriefEmailRecipientRow,
): boolean {
  const updatedDiff = candidate.updatedAt.getTime() - current.updatedAt.getTime();
  if (updatedDiff !== 0) return updatedDiff > 0;

  const subscribedDiff = candidate.subscribedAt.getTime() - current.subscribedAt.getTime();
  if (subscribedDiff !== 0) return subscribedDiff > 0;

  return candidate.userId.localeCompare(current.userId) < 0;
}

/**
 * 订阅记录仍按用户保留；实际收件名单按规范化邮箱去重。
 * 同一邮箱对应多个用户时，使用最近更新的记录展示审计信息。
 */
export function dedupeAiBriefEmailRecipients(
  rows: readonly AiBriefEmailRecipientRow[],
): AiBriefEmailRecipientRow[] {
  const recipients = new Map<string, AiBriefEmailRecipientRow>();

  for (const row of rows) {
    const normalizedEmail = row.email.trim().toLowerCase();
    const candidate = { ...row, email: normalizedEmail };
    const current = recipients.get(normalizedEmail);
    if (!current || isNewerRecipient(candidate, current)) {
      recipients.set(normalizedEmail, candidate);
    }
  }

  return [...recipients.values()].sort(
    (a, b) =>
      b.subscribedAt.getTime() - a.subscribedAt.getTime() ||
      a.email.localeCompare(b.email) ||
      a.userId.localeCompare(b.userId),
  );
}
