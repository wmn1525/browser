import { Copy, Download, Eye, Laptop, MoreVertical, Pencil, Play, Power, Settings, Trash2, UserPlus } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import type { ProfileSummary } from '../../../../shared/types';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu';
import { Table, Td, Th } from '../ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';

export type ProfileCommand =
  | 'launch'
  | 'close'
  | 'edit'
  | 'duplicate'
  | 'delete'
  | 'export'
  | 'detail'
  | 'proxy'
  | 'account';

interface ProfileTableProps {
  readonly profiles: readonly ProfileSummary[];
  readonly selectedIds: readonly string[];
  readonly onCommand: (command: ProfileCommand, profileId: string) => void;
  readonly onSelectedIdsChange: (profileIds: readonly string[]) => void;
}

/** Profile 表格，保留参考页面列结构并接入完整行操作。 */
export function ProfileTable({
  onCommand,
  onSelectedIdsChange,
  profiles,
  selectedIds
}: ProfileTableProps): JSX.Element {
  const allSelected = profiles.length > 0 && profiles.every((profile) => selectedIds.includes(profile.id));

  return (
    <div className="min-w-[980px] overflow-hidden rounded-lg border bg-card shadow-sm">
      <Table>
        <thead>
          <tr>
            <Th className="w-11">
              <Checkbox
                checked={allSelected}
                onCheckedChange={(checked) => {
                  onSelectedIdsChange(checked ? profiles.map((profile) => profile.id) : []);
                }}
              />
            </Th>
            <Th>编号</Th>
            <Th>系统----代理----账号</Th>
            <Th>名称</Th>
            <Th>分组名称</Th>
            <Th>最近打开时间</Th>
            <Th>标签</Th>
            <Th>备注</Th>
            <Th className="border-l">操作</Th>
          </tr>
        </thead>
        <tbody>
          {profiles.map((profile) => (
            <tr className={profile.isRunning ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-primary/5'} key={profile.id}>
              <Td>
                <Checkbox
                  checked={selectedIds.includes(profile.id)}
                  onCheckedChange={(checked) => {
                    onSelectedIdsChange(toggleSelected(selectedIds, profile.id, Boolean(checked)));
                  }}
                />
              </Td>
              <Td>{profile.id}</Td>
              <Td>
                <div className="flex items-center gap-2">
                  <Laptop className="size-5 text-blue-500" />
                  <IconButton onClick={() => onCommand('proxy', profile.id)} title={profile.proxyLabel}><Settings className="size-4" /></IconButton>
                  <IconButton onClick={() => onCommand('account', profile.id)} title="绑定账号"><UserPlus className="size-4" /></IconButton>
                </div>
              </Td>
              <Td className={profile.name ? '' : 'text-muted-foreground'}>{profile.name || '————'}</Td>
              <Td><Badge tone="primary">未分组</Badge></Td>
              <Td className="text-xs text-muted-foreground">{formatRelativeTime(profile.lastLaunchedAt)}</Td>
              <Td><Tags tags={profile.tags} /></Td>
              <Td className="max-w-48 truncate text-xs text-muted-foreground">{profile.proxyLabel === 'Direct' ? '直连环境' : profile.proxyLabel}</Td>
              <Td className="border-l">
                <div className="flex items-center gap-2">
                  <RowActionButton onCommand={onCommand} profile={profile} />
                  <ProfileMoreMenu onCommand={onCommand} profile={profile} />
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
      {profiles.length === 0 ? <div className="p-9 text-center text-muted-foreground">还没有浏览器环境</div> : null}
    </div>
  );
}

function Tags({ tags }: { readonly tags: readonly string[] }): JSX.Element {
  const visibleTags = tags.length > 0 ? tags : ['无标签'];
  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => <Badge key={tag}>{tag}</Badge>)}
    </div>
  );
}

function RowActionButton({
  onCommand,
  profile
}: {
  readonly onCommand: ProfileTableProps['onCommand'];
  readonly profile: ProfileSummary;
}): JSX.Element {
  if (profile.isRunning) {
    return (
      <Button onClick={() => onCommand('close', profile.id)} size="sm" type="button" variant="destructive">
        <Power className="size-4" />
        关闭
      </Button>
    );
  }

  return (
    <Button onClick={() => onCommand('launch', profile.id)} size="sm" type="button">
      <Play className="size-4" />
      启动
    </Button>
  );
}

function ProfileMoreMenu({
  onCommand,
  profile
}: {
  readonly onCommand: ProfileTableProps['onCommand'];
  readonly profile: ProfileSummary;
}): JSX.Element {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className="h-8 w-8" size="icon" type="button" variant="ghost"><MoreVertical className="size-4" /></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onCommand('detail', profile.id)}><Eye className="size-4" />查看详情</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCommand('edit', profile.id)}><Pencil className="size-4" />编辑</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCommand('duplicate', profile.id)}><Copy className="size-4" />复制</DropdownMenuItem>
        <DropdownMenuItem onClick={() => onCommand('export', profile.id)}><Download className="size-4" />导出 JSON</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onCommand('delete', profile.id)}>
          <Trash2 className="size-4" />删除
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function IconButton({
  children,
  onClick,
  title
}: PropsWithChildren<{ readonly onClick: () => void; readonly title: string }>): JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button className="h-7 w-7" onClick={onClick} size="icon" title={title} type="button" variant="ghost">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  );
}

function toggleSelected(selectedIds: readonly string[], profileId: string, checked: boolean): readonly string[] {
  if (checked) {
    return selectedIds.includes(profileId) ? selectedIds : [...selectedIds, profileId];
  }

  return selectedIds.filter((id) => id !== profileId);
}

function formatRelativeTime(timestamp: number | undefined): string {
  if (!timestamp) {
    return '未打开';
  }

  const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return '刚刚';

  const units = [
    { seconds: 60, name: '分钟' },
    { seconds: 3600, name: '小时' },
    { seconds: 86400, name: '天' },
    { seconds: 2592000, name: '个月' },
    { seconds: 31536000, name: '年' }
  ];
  const unit = [...units].reverse().find((item) => diffSeconds >= item.seconds) ?? units[0];
  return `${Math.floor(diffSeconds / unit.seconds)}${unit.name}前`;
}
