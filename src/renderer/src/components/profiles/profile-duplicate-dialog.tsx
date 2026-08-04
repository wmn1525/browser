import { InputNumber, Modal } from 'antd';
import { useEffect, useState } from 'react';

import { buildCopyNames } from './profile-duplicate';

/** 单次复制份数上限，防止误输入一次撑出上万个环境。 */
const MAX_COPY_COUNT = 200;

interface ProfileDuplicateDialogProps {
  readonly onCancel: () => void;
  readonly onSubmit: (count: number) => void;
  readonly open: boolean;
  /** 待复制的源环境名，单个和批量共用同一个弹窗。 */
  readonly profileNames: readonly string[];
  /** 现有全部环境名，用于跳过已被占用的编号。 */
  readonly usedNames: readonly string[];
}

/** 把选中的环境各复制成多份，副本名按 -1、-2 顺延。 */
export function ProfileDuplicateDialog({
  onCancel,
  onSubmit,
  open,
  profileNames,
  usedNames
}: ProfileDuplicateDialogProps): JSX.Element {
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (open) {
      setCount(1);
    }
  }, [open]);

  const total = profileNames.length * count;

  return (
    <Modal
      cancelText="取消"
      centered
      okText={`确认复制 ${total} 个`}
      onCancel={onCancel}
      onOk={() => onSubmit(count)}
      open={open}
      title={getTitle(profileNames)}
    >
      <label className="flex items-center gap-3 text-sm">
        每个环境复制
        <InputNumber max={MAX_COPY_COUNT} min={1} onChange={(value) => setCount(value ?? 1)} precision={0} value={count} />
        份
        <span className="text-xs text-muted-foreground">最多 {MAX_COPY_COUNT} 份</span>
      </label>
      <p className="mt-3 text-xs text-muted-foreground">{getPreview(profileNames, count, usedNames)}</p>
      <p className="mt-1 text-xs text-muted-foreground">每份都会重新生成硬件指纹，UA、语言、时区和代理标签沿用原环境。</p>
    </Modal>
  );
}

function getTitle(profileNames: readonly string[]): string {
  return profileNames.length === 1 ? `复制多份「${profileNames[0] ?? ''}」` : `批量复制多份（${profileNames.length} 个环境）`;
}

/** 单个源环境时直接给出副本名首尾，多个时只报总数，避免弹窗被名字列表撑长。 */
function getPreview(profileNames: readonly string[], count: number, usedNames: readonly string[]): string {
  const total = profileNames.length * count;
  if (profileNames.length !== 1) {
    return `将为 ${profileNames.length} 个环境各创建 ${count} 份，共新增 ${total} 个环境。`;
  }

  const names = buildCopyNames(profileNames[0] ?? '', count, usedNames);
  const preview = names.length <= 3 ? names.join('、') : `${names.at(0) ?? ''} … ${names.at(-1) ?? ''}`;
  return `将创建：${preview}`;
}
