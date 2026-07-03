import { Button, Checkbox, Dropdown, Tag, Tooltip, type MenuProps } from 'antd';
import { Chrome, Copy, Download, Eye, Flame, MoreVertical, Pencil, Play, Power, Trash2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import type { ProfileGroup, ProfileSummary } from '../../../../shared/types';
import { getKernelEngine } from './browser-kernel-options';
import { getGroupLabel } from './profile-groups';

export type ProfileCommand =
  | 'launch'
  | 'close'
  | 'edit'
  | 'duplicate'
  | 'delete'
  | 'export'
  | 'detail';

interface ProfileTableProps {
  readonly groups: readonly ProfileGroup[];
  readonly profiles: readonly ProfileSummary[];
  readonly selectedIds: readonly string[];
  readonly onCommand: (command: ProfileCommand, profileId: string) => void;
  readonly onSelectedIdsChange: (profileIds: readonly string[]) => void;
}

/** Profile 表格，保留参考页面列结构并接入完整行操作。 */
export function ProfileTable({
  groups,
  onCommand,
  onSelectedIdsChange,
  profiles,
  selectedIds
}: ProfileTableProps): JSX.Element {
  const allSelected = profiles.length > 0 && profiles.every((profile) => selectedIds.includes(profile.id));

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-11" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[18%]" />
            <col className="w-[14%]" />
            <col className="w-[16%]" />
            <col className="w-[116px]" />
          </colgroup>
          <thead>
            <tr>
              <Th>
                <Checkbox
                  checked={allSelected}
                  onChange={(event) => {
                    onSelectedIdsChange(event.target.checked ? profiles.map((profile) => profile.id) : []);
                  }}
                />
              </Th>
              <Th>名称</Th>
              <Th>分组名称</Th>
              <Th>代理IP</Th>
              <Th>最近打开时间</Th>
              <Th>标签</Th>
              <Th className="sticky right-0 z-30 border-l bg-muted">操作</Th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr className={profile.isRunning ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-primary/5'} key={profile.id}>
                <Td>
                  <Checkbox
                    checked={selectedIds.includes(profile.id)}
                    onChange={(event) => {
                      onSelectedIdsChange(toggleSelected(selectedIds, profile.id, event.target.checked));
                    }}
                  />
                </Td>
                <Td className={profile.name ? '' : 'text-muted-foreground'}>
                  <div className="flex min-w-0 items-center gap-2">
                    <BrowserTypeIcon kernelId={profile.browserKernel} />
                    <CellText>{profile.name || '————'}</CellText>
                  </div>
                </Td>
                <Td><Tag className="max-w-full truncate" color={profile.groupId ? 'blue' : 'default'}>{getGroupLabel(groups, profile.groupId)}</Tag></Td>
                <Td className="text-xs text-muted-foreground"><CellText>{formatProxyAddress(profile.proxyLabel)}</CellText></Td>
                <Td className="text-xs text-muted-foreground"><CellText>{formatRelativeTime(profile.lastLaunchedAt)}</CellText></Td>
                <Td><Tags tags={profile.tags} /></Td>
                <Td className="sticky right-0 z-10 border-l bg-card shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.55)]">
                  <div className="flex items-center justify-end gap-2">
                    <RowActionButton onCommand={onCommand} profile={profile} />
                    <ProfileMoreMenu onCommand={onCommand} profile={profile} />
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {profiles.length === 0 ? <div className="p-9 text-center text-muted-foreground">还没有浏览器环境</div> : null}
    </div>
  );
}

function Tags({ tags }: { readonly tags: readonly string[] }): JSX.Element {
  const visibleTags = tags.length > 0 ? tags : ['无标签'];
  return (
    <div className="flex min-w-0 flex-wrap gap-1">
      {visibleTags.map((tag) => <Tag className="max-w-full truncate" key={tag}>{tag}</Tag>)}
    </div>
  );
}

/** 按 profile 保存的内核类型显示浏览器标识，避免只看名称时分不清 Chrome 和 Firefox。 */
function BrowserTypeIcon({ kernelId }: { readonly kernelId: string | undefined }): JSX.Element {
  const engine = getKernelEngine(kernelId ?? 'system-chrome');
  if (engine === 'firefox') {
    return (
      <Tooltip title="Firefox">
        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-orange-50 text-orange-500">
          <Flame className="size-3.5" />
        </span>
      </Tooltip>
    );
  }

  return (
    <Tooltip title="Chrome">
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-500">
        <Chrome className="size-3.5" />
      </span>
    </Tooltip>
  );
}

function CellText({ children }: PropsWithChildren): JSX.Element {
  return <div className="min-w-0 truncate">{children}</div>;
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
      <Button danger htmlType="button" onClick={() => onCommand('close', profile.id)} size="small">
        <Power className="size-4" />
        关闭
      </Button>
    );
  }

  return (
    <Button htmlType="button" onClick={() => onCommand('launch', profile.id)} size="small" type="primary">
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
  const items: MenuProps['items'] = [
    { key: 'detail', icon: <Eye className="size-4" />, label: '查看详情' },
    { key: 'edit', icon: <Pencil className="size-4" />, label: '编辑' },
    { key: 'duplicate', icon: <Copy className="size-4" />, label: '复制' },
    { key: 'export', icon: <Download className="size-4" />, label: '导出 JSON' },
    { type: 'divider' },
    { danger: true, key: 'delete', icon: <Trash2 className="size-4" />, label: '删除' }
  ];

  function handleMenuClick({ key }: { readonly key: string }): void {
    onCommand(key as ProfileCommand, profile.id);
  }

  return (
    <Dropdown menu={{ items, onClick: handleMenuClick }} trigger={['click']}>
      <Button className="h-8 w-8 p-0" htmlType="button" type="text"><MoreVertical className="size-4" /></Button>
    </Dropdown>
  );
}

function Th({ children, className }: PropsWithChildren<{ readonly className?: string }>): JSX.Element {
  return <th className={['sticky top-0 z-20 border-b bg-muted px-3 py-2 text-xs font-semibold text-secondary', className].filter(Boolean).join(' ')}>{children}</th>;
}

function Td({ children, className }: PropsWithChildren<{ readonly className?: string }>): JSX.Element {
  return <td className={['overflow-hidden border-b px-3 py-3 align-middle', className].filter(Boolean).join(' ')}>{children}</td>;
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

function formatProxyAddress(proxyLabel: string): string {
  if (proxyLabel === 'Direct') {
    return '直连';
  }

  return proxyLabel.replace(/^[a-z0-9]+:\/\//i, '');
}
