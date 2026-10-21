import assert from 'node:assert/strict';
import test from 'node:test';
import { assetCreatorName } from '../src/domain/assetCreator.ts';

test('创建人取 author，空或占位值时退回 publisher，都没有返回空串', () => {
  assert.equal(assetCreatorName({ author: ' 张三 ', publisher: '李四' }), '张三');
  assert.equal(assetCreatorName({ author: '华为 MSS', publisher: 'Mcyo' }), '华为 MSS');
  assert.equal(assetCreatorName({ author: 'Imported', publisher: 'Mcyo' }), 'Mcyo');
  assert.equal(assetCreatorName({ author: '', publisher: ' ' }), '');
  assert.equal(assetCreatorName({ author: 'IMPORTED' }), '');
  assert.equal(assetCreatorName({ author: '未知', publisher: '-' }), '');
});
