export function appendAttachmentReference(current: string, filename: string): string {
  const line = `📎 附件：${filename}`;
  return current.trim() ? `${current.trim()}\n${line}` : line;
}
