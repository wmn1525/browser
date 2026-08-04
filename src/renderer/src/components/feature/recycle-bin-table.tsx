import { Button, Tag } from 'antd';
import { RotateCcw, Trash2 } from 'lucide-react';
import type { PropsWithChildren } from 'react';

import type { ProfileSummary } from '../../../../shared/types';

interface RecycleBinTableProps {
  /** 正在操作的环境 id，用于禁用该行按钮避免重复提交。 */
  readonly busyId: string | undefined;
  readonly onPurge: (profile: ProfileSummary) => void;
  readonly onRestore: (profile: ProfileSummary) => void;
  readonly profiles: readonly ProfileSummary[];
}

/** 回收站表格；按需求只提供恢复与彻底删除，不复用环境管理的行操作菜单。 */
export function RecycleBinTable({ busyId, onPurge, onRestore, profiles }: RecycleBinTableProps): JSX.Element {
  return (
    <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="min-h-0 overflow-y-auto overflow-x-hidden">
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[18%]" />
            <col className="w-[22%]" />
            <col className="w-[28%]" />
          </colgroup>
          <thead>
            <tr>
              <Th>名称</Th>
              <Th>标签</Th>
              <Th>删除时间</Th>
              <Th className="text-right">操作</Th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => (
              <tr className="hover:bg-primary/5" key={profile.id}>
                <Td><div className="min-w-0 truncate font-medium">{profile.name}</div></Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {profile.tags.length > 0 ? profile.tags.map((tag) => <Tag key={tag}>{tag}</Tag>) : <Tag>无标签</Tag>}
                  </div>
                </Td>
                <Td><span className="text-muted-foreground">{formatDeletedAt(profile.deletedAt)}</span></Td>
                <Td>
                  <div className="flex items-center justify-end gap-2">
                    <Button disabled={busyId === profile.id} htmlType="button" onClick={() => onRestore(profile)} size="small" type="primary">
                      <RotateCcw className="size-4" />恢复
                    </Button>
                    <Button danger disabled={busyId === profile.id} htmlType="button" onClick={() => onPurge(profile)} size="small">
                      <Trash2 className="size-4" />彻底删除
                    </Button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatDeletedAt(deletedAt: number | undefined): string {
  return deletedAt === undefined ? '未知' : new Date(deletedAt).toLocaleString('zh-CN');
}

function Th({ children, className }: PropsWithChildren<{ readonly className?: string }>): JSX.Element {
  return (
    <th className={['sticky top-0 z-20 border-b bg-muted px-3 py-2 text-xs font-semibold text-secondary', className].filter(Boolean).join(' ')}>
      {children}
    </th>
  );
}

function Td({ children }: PropsWithChildren): JSX.Element {
  return <td className="overflow-hidden border-b px-3 py-3 align-middle">{children}</td>;
}
