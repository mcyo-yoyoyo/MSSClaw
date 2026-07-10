import { useEffect, useState } from 'react';
import { CenterModal } from '@/components/center/CenterShell';
import { FormField, FormInput, FormSelect, FormTextarea, ModalActions } from '@/components/center/CenterFormFields';
import { KB_COLLECTIONS } from '@/domain/prototype/kb';
import type { PrototypeKbDocument } from '@/domain/prototype/types';
import { useMarketplaceStore } from '@/stores/marketplaceStore';

type EditorTarget = string | null;

interface KbDocumentEditorModalProps {
  target: EditorTarget;
  onClose: () => void;
}

export function KbDocumentEditorModal({ target, onClose }: KbDocumentEditorModalProps) {
  const { kbDocs, upsertKbDoc, showToast } = useMarketplaceStore();
  const [form, setForm] = useState<PrototypeKbDocument | null>(null);

  useEffect(() => {
    if (!target) {
      setForm(null);
      return;
    }
    const existing = kbDocs.find((d) => d.id === target);
    setForm(existing ? { ...existing } : null);
  }, [target, kbDocs]);

  if (!target || !form) return null;

  const collections = KB_COLLECTIONS.filter((c) => c.id !== 'all');

  const handleSave = () => {
    const title = form.title.trim();
    if (!title) {
      showToast('请填写文档标题');
      return;
    }
    upsertKbDoc({
      ...form,
      title,
      desc: form.desc.trim() || form.desc,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    showToast('文档元数据已保存');
    onClose();
  };

  return (
    <CenterModal
      open
      title="编辑文档元数据"
      onClose={onClose}
      actions={
        <ModalActions
          onCancel={onClose}
          onSave={handleSave}
          saveLabel="保存"
        />
      }
    >
      <div className="space-y-4 text-left">
        <FormField label="标题">
          <FormInput
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </FormField>
        <FormField label="摘要">
          <FormTextarea
            rows={3}
            value={form.desc}
            onChange={(e) => setForm({ ...form, desc: e.target.value })}
          />
        </FormField>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="业务部门">
            <FormSelect
              value={form.collection}
              onChange={(e) => setForm({ ...form, collection: e.target.value })}
            >
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField label="密级">
            <FormSelect
              value={form.clearance}
              onChange={(e) => setForm({ ...form, clearance: e.target.value })}
            >
              {['L1', 'L2', 'L3', 'L4'].map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </FormSelect>
          </FormField>
        </div>
        <FormField label="标签" hint="多个标签用逗号分隔">
          <FormInput
            value={form.tags.join(', ')}
            onChange={(e) =>
              setForm({
                ...form,
                tags: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean),
              })
            }
          />
        </FormField>
      </div>
    </CenterModal>
  );
}
