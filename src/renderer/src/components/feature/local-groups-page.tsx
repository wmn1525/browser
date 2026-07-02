import { Button, Input, Modal, Tag } from 'antd';
import { Edit2, FolderOpen, FolderPlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileGroup, ProfileSummary } from '../../../../shared/types';
import { canDeleteGroup, countProfilesByGroup } from '../profiles/profile-groups';

interface LocalGroupsPageProps {
  readonly groups: readonly ProfileGroup[];
  readonly onCreateGroup: (name: string) => void;
  readonly onDeleteGroup: (groupId: string) => void;
  readonly onOpenGroup: (groupId: string) => void;
  readonly onRenameGroup: (groupId: string, name: string) => void;
  readonly profiles: readonly ProfileSummary[];
}

/** 本地 profile 分组管理页，只操作 userData 中的本机分组列表。 */
export function LocalGroupsPage({
  groups,
  onCreateGroup,
  onDeleteGroup,
  onOpenGroup,
  onRenameGroup,
  profiles
}: LocalGroupsPageProps): JSX.Element {
  const groupCounts = countProfilesByGroup(groups, profiles);
  const ungroupedCount = profiles.filter((profile) => !profile.groupId).length;
  const [dialog, setDialog] = useState<GroupDialogState>();

  function submitGroupName(name: string): void {
    if (!dialog) {
      return;
    }
    if (dialog.mode === 'create') {
      onCreateGroup(name);
    } else {
      onRenameGroup(dialog.groupId, name);
    }
    setDialog(undefined);
  }

  return (
    <section className="flex-1 overflow-auto p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold">分组管理</h2>
          <p className="mt-2 text-sm text-muted-foreground">分组仅保存在本机，用于整理本地浏览器环境。</p>
        </div>
        <Button htmlType="button" onClick={() => setDialog({ mode: 'create' })} type="primary"><FolderPlus className="size-4" />新建分组</Button>
      </div>

      <div className="grid gap-3">
        <GroupRow
          count={ungroupedCount}
          name="未分组"
          onOpen={() => onOpenGroup('ungrouped')}
        />
        {groupCounts.map(({ count, group }) => (
          <GroupRow
            canDelete={canDeleteGroup(group.id, profiles)}
            count={count}
            key={group.id}
            name={group.name}
            onDelete={() => onDeleteGroup(group.id)}
            onOpen={() => onOpenGroup(group.id)}
            onRename={() => setDialog({ groupId: group.id, initialName: group.name, mode: 'rename' })}
          />
        ))}
      </div>
      <GroupNameDialog
        initialName={dialog?.initialName}
        mode={dialog?.mode}
        onOpenChange={(open) => { if (!open) setDialog(undefined); }}
        onSubmit={submitGroupName}
        open={Boolean(dialog)}
      />
    </section>
  );
}

type GroupDialogState =
  | { readonly mode: 'create'; readonly initialName?: undefined; readonly groupId?: undefined }
  | { readonly mode: 'rename'; readonly initialName: string; readonly groupId: string };

function GroupRow({
  canDelete,
  count,
  name,
  onDelete,
  onOpen,
  onRename
}: {
  readonly canDelete?: boolean;
  readonly count: number;
  readonly name: string;
  readonly onDelete?: () => void;
  readonly onOpen: () => void;
  readonly onRename?: () => void;
}): JSX.Element {
  return (
    <article className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 shadow-sm">
      <div>
        <div className="flex items-center gap-2">
          <FolderOpen className="size-4 text-primary" />
          <h3 className="font-medium">{name}</h3>
          <Tag>{count} 个环境</Tag>
        </div>
      </div>
      <div className="flex gap-2">
        <Button htmlType="button" onClick={onOpen} size="small">查看环境</Button>
        {onRename ? <Button className="h-8 w-8 p-0" htmlType="button" onClick={onRename} size="small" title="重命名"><Edit2 className="size-4" /></Button> : null}
        {onDelete ? (
          <Button className="h-8 w-8 p-0" disabled={!canDelete} htmlType="button" onClick={onDelete} size="small" title="删除空分组">
            <Trash2 className="size-4" />
          </Button>
        ) : null}
      </div>
    </article>
  );
}

function GroupNameDialog({
  initialName,
  mode,
  onOpenChange,
  onSubmit,
  open
}: {
  readonly initialName?: string;
  readonly mode?: 'create' | 'rename';
  readonly onOpenChange: (open: boolean) => void;
  readonly onSubmit: (name: string) => void;
  readonly open: boolean;
}): JSX.Element {
  const [name, setName] = useState(initialName ?? '');

  useEffect(() => {
    setName(initialName ?? '');
  }, [initialName, open]);

  return (
    <Modal footer={null} onCancel={() => onOpenChange(false)} open={open} title={mode === 'rename' ? '重命名分组' : '新建分组'}>
        <p className="text-sm text-muted-foreground">分组只保存在本机，用于整理本地浏览器环境。</p>
        <form className="mt-4 grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name);
        }}>
          <label className="grid gap-2 text-sm text-foreground">
            分组名称
            <Input autoFocus maxLength={32} onChange={(event) => setName(event.target.value)} placeholder="请输入分组名称" value={name} />
          </label>
          <div className="flex justify-end gap-2">
            <Button htmlType="button" onClick={() => onOpenChange(false)}>取消</Button>
            <Button htmlType="submit" type="primary">{mode === 'rename' ? '保存' : '创建'}</Button>
          </div>
        </form>
    </Modal>
  );
}
