import { Copy, Pencil, RefreshCw, Trash2 } from 'lucide-react';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import type { ProxyPoolItem, ProxyPoolStatus } from './proxy-pool-types';

interface ProxyTableProps {
  readonly allVisibleSelected: boolean;
  readonly onCheck: (proxyId: string) => void;
  readonly onCopy: (proxy: ProxyPoolItem) => void;
  readonly onDelete: (proxyId: string) => void;
  readonly onEdit: (proxy: ProxyPoolItem) => void;
  readonly onToggle: (proxyId: string) => void;
  readonly onToggleAll: () => void;
  readonly proxies: readonly ProxyPoolItem[];
  readonly selectedIds: readonly string[];
}

/** 代理池表格，承载选择、检测、复制、编辑和删除操作。 */
export function ProxyTable({
  allVisibleSelected,
  onCheck,
  onCopy,
  onDelete,
  onEdit,
  onToggle,
  onToggleAll,
  proxies,
  selectedIds
}: ProxyTableProps): JSX.Element {
  return (
    <table className="w-full border-collapse text-left text-sm">
      <thead>
        <tr className="border-b bg-muted/70 text-xs text-muted-foreground">
          <th className="w-12 px-4 py-3"><input checked={allVisibleSelected} onChange={onToggleAll} type="checkbox" /></th>
          <th className="px-4 py-3 font-medium">编号</th>
          <th className="px-4 py-3 font-medium">出口 IP</th>
          <th className="px-4 py-3 font-medium">备注</th>
          <th className="px-4 py-3 text-center font-medium">关联环境数</th>
          <th className="px-4 py-3 font-medium">代理信息</th>
          <th className="px-4 py-3 font-medium">标签</th>
          <th className="px-4 py-3 font-medium">操作</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {proxies.length === 0 ? (
          <tr>
            <td className="px-4 py-12 text-center text-sm text-muted-foreground" colSpan={8}>
              暂无代理，点击右上角新增导入
            </td>
          </tr>
        ) : proxies.map((proxy, index) => (
          <ProxyRow
            index={proxies.length - index}
            key={proxy.id}
            onCheck={() => onCheck(proxy.id)}
            onCopy={() => onCopy(proxy)}
            onDelete={() => onDelete(proxy.id)}
            onEdit={() => onEdit(proxy)}
            onToggle={() => onToggle(proxy.id)}
            proxy={proxy}
            selected={selectedIds.includes(proxy.id)}
          />
        ))}
      </tbody>
    </table>
  );
}

function ProxyRow({
  index,
  onCheck,
  onCopy,
  onDelete,
  onEdit,
  onToggle,
  proxy,
  selected
}: {
  readonly index: number;
  readonly onCheck: () => void;
  readonly onCopy: () => void;
  readonly onDelete: () => void;
  readonly onEdit: () => void;
  readonly onToggle: () => void;
  readonly proxy: ProxyPoolItem;
  readonly selected: boolean;
}): JSX.Element {
  return (
    <tr className="hover:bg-primary/5">
      <td className="px-4 py-3"><input checked={selected} onChange={onToggle} type="checkbox" /></td>
      <td className="px-4 py-3">{index}</td>
      <td className="px-4 py-3">
        <div className="text-xs">
          <div className="font-medium">{proxy.region ?? '- (-)'}</div>
          <div className="text-muted-foreground">{getStatusLabel(proxy.status)} | IP {proxy.exitIp ?? '-'}</div>
        </div>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{proxy.remark || '未备注'}</td>
      <td className="px-4 py-3 text-center">{proxy.profileCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-medium">{proxy.host}:{proxy.port}</span>
          <Badge tone="primary">{proxy.protocol.toUpperCase()}</Badge>
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">{proxy.tags.length ? proxy.tags.map((tag) => <Badge key={tag}>{tag}</Badge>) : <Badge>未标签</Badge>}</div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Button onClick={onCheck} size="sm" type="button" variant="ghost"><RefreshCw className="size-3.5" /></Button>
          <Button onClick={onCopy} size="sm" type="button" variant="ghost"><Copy className="size-3.5" /></Button>
          <Button onClick={onEdit} size="sm" type="button" variant="ghost"><Pencil className="size-3.5" /></Button>
          <Button onClick={onDelete} size="sm" type="button" variant="ghost"><Trash2 className="size-3.5" /></Button>
        </div>
      </td>
    </tr>
  );
}

function getStatusLabel(status: ProxyPoolStatus): string {
  if (status === 'checking') return '检测中';
  if (status === 'ok') return '可用';
  if (status === 'failed') return '失败';
  return '未检测';
}
