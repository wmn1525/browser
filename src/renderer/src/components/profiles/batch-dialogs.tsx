import { Modal, Select } from 'antd';
import { useEffect, useState } from 'react';

import type { ProfileGroup } from '../../../../shared/types';

/** 分组下拉里代表「移出分组」的取值，不写入 profile。 */
const UNGROUPED_VALUE = 'ungrouped';

interface BatchTagDialogProps {
  readonly onCancel: () => void;
  readonly onSubmit: (tags: readonly string[]) => void;
  readonly open: boolean;
}

/** 批量标签弹窗；Electron 渲染进程不支持原生 window.prompt，必须用应用内弹窗采集输入。 */
export function BatchTagDialog({ onCancel, onSubmit, open }: BatchTagDialogProps): JSX.Element {
  const [tags, setTags] = useState<readonly string[]>([]);

  useEffect(() => {
    if (open) {
      setTags([]);
    }
  }, [open]);

  return (
    <Modal
      cancelText="取消"
      okButtonProps={{ disabled: tags.length === 0 }}
      okText="确认添加"
      onCancel={onCancel}
      onOk={() => onSubmit(tags)}
      open={open}
      title="批量添加标签"
    >
      <Select
        className="w-full"
        mode="tags"
        onChange={(value: string[]) => setTags(value.map((tag) => tag.trim()).filter(Boolean))}
        open={false}
        placeholder="输入标签后按回车，可添加多个"
        value={[...tags]}
      />
      <p className="mt-2 text-xs text-muted-foreground">标签会追加到所选环境已有标签上，不会覆盖原标签。</p>
    </Modal>
  );
}

interface BatchGroupDialogProps {
  readonly groups: readonly ProfileGroup[];
  readonly onCancel: () => void;
  readonly onSubmit: (groupId: string | undefined) => void;
  readonly open: boolean;
}

/** 批量分组弹窗，只允许选择已存在的本地分组或移出分组，避免写入不存在的 groupId。 */
export function BatchGroupDialog({ groups, onCancel, onSubmit, open }: BatchGroupDialogProps): JSX.Element {
  const [groupId, setGroupId] = useState(UNGROUPED_VALUE);

  useEffect(() => {
    if (open) {
      setGroupId(UNGROUPED_VALUE);
    }
  }, [open]);

  return (
    <Modal
      cancelText="取消"
      okText="确认移动"
      onCancel={onCancel}
      onOk={() => onSubmit(groupId === UNGROUPED_VALUE ? undefined : groupId)}
      open={open}
      title="批量移动分组"
    >
      <Select
        className="w-full"
        onChange={setGroupId}
        options={[
          { label: '未分组', value: UNGROUPED_VALUE },
          ...groups.map((group) => ({ label: group.name, value: group.id }))
        ]}
        value={groupId}
      />
      <p className="mt-2 text-xs text-muted-foreground">选择「未分组」会把所选环境移出当前分组。</p>
    </Modal>
  );
}
