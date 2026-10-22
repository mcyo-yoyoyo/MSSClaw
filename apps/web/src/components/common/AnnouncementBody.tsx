import { resolveWorkspaceBlobUrl } from '@/api/blobApi';
import { parseAnnouncementBody } from '@/domain/announcementBody';
import { cn } from '@/lib/utils';

/** 站内公告正文：文字保留换行，单独成行的平台图片按正文宽度显示，点击在新标签页打开原图 */
export function AnnouncementBody({ body, className }: { body: string; className?: string }) {
  return (
    <div className={cn('space-y-3 text-[13px] leading-relaxed text-zinc-700', className)}>
      {parseAnnouncementBody(body).map((block, index) =>
        block.type === 'text' ? (
          <p key={index} className="whitespace-pre-wrap">
            {block.text}
          </p>
        ) : (
          <a
            key={index}
            href={resolveWorkspaceBlobUrl(block.url)}
            target="_blank"
            rel="noopener noreferrer"
            title="在新标签页查看原图"
            className="block w-fit max-w-full"
          >
            <img
              src={resolveWorkspaceBlobUrl(block.url)}
              alt={block.alt}
              loading="lazy"
              className="max-h-[480px] max-w-full rounded-lg border border-zinc-100 object-contain"
            />
          </a>
        ),
      )}
    </div>
  );
}
