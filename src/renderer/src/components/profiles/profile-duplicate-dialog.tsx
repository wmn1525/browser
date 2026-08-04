import { InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { buildCopyNames } from './profile-duplicate';

/** 单次复制份数上限，防止误输入一次撑出上万个环境。 */
const MAX_COPY_COUNT = 200;

interface ProfileDuplicateDialogProps {
  readonly onCancel: () => void;
  readonly onSubmit: (names: readonly string[]) => void;
  readonly open: boolean;
  readonly profileName: string;
  /** 现有全部环境名，用于跳过已被占用的编号。 */
  readonly usedNames: readonly string[];
}

/** 把一个环境复制成多份，副本名按 -1、-2 顺延。 */
export function ProfileDuplicateDialog({
  onCancel,
  onSubmit,
  open,
  profileName,
  usedNames
}: ProfileDuplicateDialogProps): JSX.Element {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (open) {
      setCount(1);
    }
  }, [open]);

  const names = buildCopyNames(profileName, count, usedNames);

  return (
    <Modal
      cancelText="取消"
      centered
      okText={`确认复制 ${count} 份`}
      onCancel={onCancel}
      onOk={() => onSubmit(names)}
      open={open}
      title={`复制多份「${profileName}」`}
    >
      <label className="flex items-center gap-3 text-sm">
        复制份数
        <InputNumber max={MAX_COPY_COUNT} min={1} onChange={(value) => setCount(value ?? 1)} precision={0} value={count} />
        <span className="text-xs text-muted-foreground">最多 {MAX_COPY_COUNT} 份</span>
      </label>
      <p className="mt-3 text-xs text-muted-foreground">将创建：{getNamePreview(names)}</p>
      <p className="mt-1 text-xs text-muted-foreground">每份都会重新生成硬件指纹，UA、语言、时区和代理标签沿用原环境。</p>
    </Modal>
  );
}

/** 份数多时只显示首尾，避免弹窗被名字列表撑长。 */
function getNamePreview(names: readonly string[]): string {
  if (names.length <= 3) {
    return names.join('、');
  }

  return `${names.at(0) ?? ''} … ${names.at(-1) ?? ''}`;
}
