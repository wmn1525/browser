import { Modal, Radio, Select } from 'antd';
import { useEffect, useState } from 'react';

import type { ProfileGroup } from '../../../../shared/types';

/** 分组下拉里代表「移出分组」的取值，不写入 profile。 */
const UNGROUPED_VALUE = 'ungrouped';

/** 批量修改标签的三种写入方式。 */
export type BatchTagMode = 'append' | 'remove' | 'replace';

const tagModeOptions = [
  { label: '追加', value: 'append' },
  { label: '移除', value: 'remove' },
  { label: '覆盖', value: 'replace' }
];

const tagModeHints: Record<BatchTagMode, string> = {
  append: '标签会追加到所选环境已有标签上，不会覆盖原标签。',
  remove: '仅从所选环境上移除这些标签，其它标签保持不变。',
  replace: '会先清空所选环境的全部原有标签，只保留这里选择的标签，且无法撤销。'
};

const tagModeOkText: Record<BatchTagMode, string> = {
  append: '确认追加',
  remove: '确认移除',
  replace: '确认覆盖'
};

interface BatchTagDialogProps {
  readonly onCancel: () => void;
  readonly onSubmit: (tags: readonly string[], mode: BatchTagMode) => void;
  readonly open: boolean;
  /** 所选环境实际带的标签，移除时作候选。 */
  readonly selectedTagOptions: readonly string[];
  /** 全部已有标签，追加和覆盖时作候选。 */
  readonly tagOptions: readonly string[];
}

/** 批量标签弹窗；Electron 渲染进程不支持原生 window.prompt，必须用应用内弹窗采集输入。 */
export function BatchTagDialog({
  onCancel,
  onSubmit,
  open,
  selectedTagOptions,
  tagOptions
}: BatchTagDialogProps): JSX.Element {
  const [tags, setTags] = useState<readonly string[]>([]);
  const [mode, setMode] = useState<BatchTagMode>('append');

  useEffect(() => {
    if (open) {
      setTags([]);
      setMode('append');
    }
  }, [open]);

  // 移除只能针对所选环境真实存在的标签，否则会出现「移除一个没人有的标签」
  const options = mode === 'remove' ? selectedTagOptions : tagOptions;

  return (
    <Modal
      cancelText="取消"
      okButtonProps={{ danger: mode === 'replace', disabled: tags.length === 0 }}
      okText={tagModeOkText[mode]}
      onCancel={onCancel}
      onOk={() => onSubmit(tags, mode)}
      open={open}
      title="批量修改标签"
    >
      <Radio.Group
        onChange={(event) => {
          setMode(event.target.value as BatchTagMode);
          // 候选列表随模式切换，已选中的标签可能不在新列表里，直接清空更可预期
          setTags([]);
        }}
        optionType="button"
        options={tagModeOptions}
        value={mode}
      />
      <Select
        className="mt-3 w-full"
        mode={mode === 'remove' ? 'multiple' : 'tags'}
        onChange={(value: string[]) => setTags(value.map((tag) => tag.trim()).filter(Boolean))}
        options={options.map((tag) => ({ label: tag, value: tag }))}
        placeholder={mode === 'remove' ? '选择要移除的标签' : '选择已有标签，或输入新标签后回车'}
        value={[...tags]}
      />
      <p className={`mt-2 text-xs ${mode === 'replace' ? 'text-destructive' : 'text-muted-foreground'}`}>{tagModeHints[mode]}</p>
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
  // 不设默认值：默认选中「未分组」会让直接点确认变成「把所选环境全部移出分组」
  const [groupId, setGroupId] = useState<string>();

  useEffect(() => {
    if (open) {
      setGroupId(undefined);
    }
  }, [open]);

  return (
    <Modal
      cancelText="取消"
      okButtonProps={{ disabled: groupId === undefined }}
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
        placeholder="请选择目标分组"
        value={groupId}
      />
      <p className="mt-2 text-xs text-muted-foreground">选择「未分组」会把所选环境移出当前分组。</p>
    </Modal>
  );
}
