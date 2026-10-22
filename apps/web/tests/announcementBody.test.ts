import assert from 'node:assert/strict';
import test from 'node:test';
import {
  announcementImageMarkdown,
  announcementSummary,
  countAnnouncementImages,
  insertImageLine,
  parseAnnouncementBody,
} from '../src/domain/announcementBody.ts';

const IMG = '![上线截图](/api/v1/blobs/abc_123-x)';

test('正文解析：单独成行的平台图片变成图片块，其它保持纯文本和换行', () => {
  const body = `第一段\n第二行\n${IMG}\n  ${IMG}  \n**不解析加粗**`;
  assert.deepEqual(parseAnnouncementBody(body), [
    { type: 'text', text: '第一段\n第二行' },
    { type: 'image', alt: '上线截图', url: '/api/v1/blobs/abc_123-x' },
    { type: 'image', alt: '上线截图', url: '/api/v1/blobs/abc_123-x' },
    { type: 'text', text: '**不解析加粗**' },
  ]);
  assert.equal(countAnnouncementImages(body), 2);
});

test('外部链接、和文字同一行的标记都按纯文本显示', () => {
  const body = '![x](https://evil.example/a.png)\n看图 ![x](/api/v1/blobs/abc)\n![x](//evil/api/v1/blobs/abc)';
  assert.deepEqual(parseAnnouncementBody(body), [{ type: 'text', text: body }]);
  assert.equal(countAnnouncementImages(body), 0);
});

test('纯文字的旧公告解析结果不变', () => {
  assert.deepEqual(parseAnnouncementBody('只有文字\n\n第二段'), [{ type: 'text', text: '只有文字\n\n第二段' }]);
  assert.deepEqual(parseAnnouncementBody(''), []);
});

test('摘要把图片换成「[图片]」', () => {
  assert.equal(announcementSummary(`开头\n${IMG}\n结尾`), '开头\n[图片]\n结尾');
});

test('图片标记：说明取文件名去掉扩展名和方括号', () => {
  assert.equal(announcementImageMarkdown('功能[新]截图.final.png', 'id1'), '![功能 新 截图.final](/api/v1/blobs/id1)');
});

test('插入图片时保证独占一行，光标落在图片行之后', () => {
  assert.deepEqual(insertImageLine('ab', 1, 'IMG'), { body: 'a\nIMG\nb', cursor: 6 });
  assert.deepEqual(insertImageLine('', 0, 'IMG'), { body: 'IMG\n', cursor: 4 });
  assert.deepEqual(insertImageLine('a\n', 2, 'IMG'), { body: 'a\nIMG\n', cursor: 6 });
  assert.deepEqual(insertImageLine('a\nb', 1, 'IMG'), { body: 'a\nIMG\nb', cursor: 6 });
});
