import { Edit2, FolderOpen, FolderPlus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import type { ProfileGroup, ProfileSummary } from '../../../../shared/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
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
        <Button onClick={() => setDialog({ mode: 'create' })} type="button"><FolderPlus className="size-4" />新建分组</Button>
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
          <Badge tone="muted">{count} 个环境</Badge>
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onOpen} size="sm" type="button" variant="outline">查看环境</Button>
        {onRename ? <Button onClick={onRename} size="icon" title="重命名" type="button" variant="outline"><Edit2 className="size-4" /></Button> : null}
        {onDelete ? (
          <Button disabled={!canDelete} onClick={onDelete} size="icon" title="删除空分组" type="button" variant="outline">
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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent>
        <DialogTitle>{mode === 'rename' ? '重命名分组' : '新建分组'}</DialogTitle>
        <DialogDescription>分组只保存在本机，用于整理本地浏览器环境。</DialogDescription>
        <form className="mt-4 grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          onSubmit(name);
        }}>
          <Label className="grid gap-2 text-sm text-foreground">
            分组名称
            <Input autoFocus maxLength={32} onChange={(event) => setName(event.target.value)} placeholder="请输入分组名称" value={name} />
          </Label>
          <div className="flex justify-end gap-2">
            <DialogClose asChild><Button type="button" variant="outline">取消</Button></DialogClose>
            <Button type="submit">{mode === 'rename' ? '保存' : '创建'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
