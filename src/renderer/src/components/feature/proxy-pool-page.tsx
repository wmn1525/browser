import { Button, Input, Select, message as antdMessage } from 'antd';
import { Plus, RefreshCw, Search } from 'lucide-react';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import { ProxyImportDialog } from './proxy-pool-dialog';
import { parseProxyPoolInput } from './proxy-pool-import';
import { ProxyTable } from './proxy-pool-table';
import type { ProxyPoolDraft, ProxyPoolItem, ProxyPoolProtocol, ProxyPoolStatus } from './proxy-pool-types';

/** 代理管理中间页，提供真实可操作的代理池列表。 */
export function ProxyPoolPage(): JSX.Element {
  const [proxies, setProxies] = useState<readonly ProxyPoolItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ProxyPoolStatus>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'single' | 'batch'>('batch');
  const [editingProxy, setEditingProxy] = useState<ProxyPoolItem>();
  const [importText, setImportText] = useState('');
  const [message, setMessage] = useState('准备就绪');

  useEffect(() => {
    void loadProxyPool();
  }, []);

  async function loadProxyPool(): Promise<void> {
    setMessage('正在读取本地代理池...');
    const items = await window.browserShell.listProxyPool();
    setProxies(items);
    setMessage(`已读取 ${items.length} 条代理`);
  }

  const filteredProxies = useMemo(
    () => proxies.filter((proxy) => matchProxy(proxy, keyword, statusFilter)),
    [keyword, proxies, statusFilter]
  );
  const allVisibleSelected = filteredProxies.length > 0 && filteredProxies.every((proxy) => selectedIds.includes(proxy.id));

  function toggleAllVisible(): void {
    if (allVisibleSelected) {
      const visibleIds = new Set(filteredProxies.map((proxy) => proxy.id));
      setSelectedIds((ids) => ids.filter((id) => !visibleIds.has(id)));
      return;
    }

    setSelectedIds((ids) => Array.from(new Set([...ids, ...filteredProxies.map((proxy) => proxy.id)])));
  }

  function toggleProxy(proxyId: string): void {
    setSelectedIds((ids) =>
      ids.includes(proxyId) ? ids.filter((id) => id !== proxyId) : [...ids, proxyId]
    );
  }

  async function addSingleProxy(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const draft = formToProxyDraft(new FormData(event.currentTarget));
    if (!draft) {
      setMessage('请填写完整代理地址和端口');
      void antdMessage.error('请填写完整代理地址和端口');
      return;
    }

    const saved = editingProxy ? await updateProxy(editingProxy, draft) : await addDrafts([draft]);
    if (!saved) {
      return;
    }

    event.currentTarget.reset();
    closeDialog();
  }

  async function importProxies(): Promise<void> {
    const drafts = parseProxyPoolInput(importText);
    if (drafts.length === 0) {
      setMessage('没有解析到可导入的代理');
      void antdMessage.error('没有解析到可导入的代理');
      return;
    }

    const saved = await addDrafts(drafts);
    if (!saved) {
      return;
    }

    closeDialog();
  }

  async function addDrafts(drafts: readonly ProxyPoolDraft[]): Promise<boolean> {
    const existingKeys = new Set(proxies.map(getProxyKey));
    const nextItems = drafts
      .filter((draft) => !existingKeys.has(getDraftKey(draft)))
      .map((draft, index) => toProxyItem(draft, index));
    if (nextItems.length === 0) {
      setMessage('没有新增代理');
      void antdMessage.error('没有新增代理');
      return false;
    }

    return saveProxyPool([...nextItems, ...proxies], `已新增 ${nextItems.length} 条代理`);
  }

  async function updateProxy(proxy: ProxyPoolItem, draft: ProxyPoolDraft): Promise<boolean> {
    const nextProxy: ProxyPoolItem = {
      ...proxy,
      ...draft,
      exitIp: undefined,
      lastCheckedAt: undefined,
      latency: undefined,
      region: undefined,
      status: 'unchecked'
    };
    return saveProxyPool(proxies.map((item) => (item.id === proxy.id ? nextProxy : item)), '已修改代理');
  }

  async function removeProxies(ids: readonly string[]): Promise<void> {
    await saveProxyPool(proxies.filter((item) => !ids.includes(item.id)), `已删除 ${ids.length} 条代理`);
    setSelectedIds((currentIds) => currentIds.filter((id) => !ids.includes(id)));
  }

  function checkProxies(ids: readonly string[]): void {
    if (ids.length === 0) {
      setMessage('请先选择代理');
      void antdMessage.error('请先选择代理');
      return;
    }

    setProxies((items) => items.map((item) => (ids.includes(item.id) ? { ...item, status: 'checking' } : item)));
    window.setTimeout(() => {
      const nextItems = proxies.map((item, index) => (ids.includes(item.id) ? withCheckResult(item, index) : item));
      void saveProxyPool(nextItems, `已检测 ${ids.length} 条代理`);
    }, 600);
  }

  async function saveProxyPool(items: readonly ProxyPoolItem[], nextMessage: string): Promise<boolean> {
    try {
      await window.browserShell.saveProxyPool(items);
      setProxies(items);
      setMessage(nextMessage);
      void antdMessage.success(nextMessage);
      return true;
    } catch {
      setMessage('代理池保存失败');
      void antdMessage.error('代理池保存失败');
      return false;
    }
  }

  return (
    <section className="flex flex-1 flex-col overflow-hidden bg-background">
      <div className="border-b bg-card px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex gap-8 border-b">
            <button className="-mb-px border-b-2 border-primary pb-2 text-sm font-medium text-primary" type="button">
              代理列表
            </button>
          </div>
          <div className="flex gap-2">
            <Button htmlType="button" onClick={() => checkProxies(selectedIds)}><RefreshCw className="size-4" />检测所选</Button>
            <Button htmlType="button" onClick={() => openAddDialog('batch')} type="primary"><Plus className="size-4" />新增导入</Button>
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" onChange={(event) => setKeyword(event.target.value)} placeholder="搜索 IP、Host、备注、标签" value={keyword} />
          </div>
          <Select
            className="w-36"
            onChange={(value) => setStatusFilter(toStatusFilter(value))}
            options={[
              { label: '全部状态', value: 'all' },
              { label: '未检测', value: 'unchecked' },
              { label: '检测中', value: 'checking' },
              { label: '可用', value: 'ok' },
              { label: '失败', value: 'failed' }
            ]}
            value={statusFilter}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
          <ProxyTable
            allVisibleSelected={allVisibleSelected}
            onCheck={(proxyId) => checkProxies([proxyId])}
            onCopy={copyProxy}
            onDelete={(proxyId) => void removeProxies([proxyId])}
            onEdit={openEditDialog}
            onToggle={toggleProxy}
            onToggleAll={toggleAllVisible}
            proxies={filteredProxies}
            selectedIds={selectedIds}
          />
        </div>
      </div>

      <div className="border-t bg-card px-6 py-3 text-xs text-muted-foreground">
        共 {filteredProxies.length} 条 / 已选 {selectedIds.length} 条 / {message}
      </div>

      <ProxyImportDialog
        editingProxy={editingProxy}
        importText={importText}
        mode={dialogMode}
        onImportTextChange={setImportText}
        onModeChange={setDialogMode}
        onOpenChange={handleDialogOpenChange}
        onSingleSubmit={(event) => void addSingleProxy(event)}
        onBatchSubmit={() => void importProxies()}
        open={dialogOpen}
      />
    </section>
  );

  function openAddDialog(mode: 'single' | 'batch'): void {
    setEditingProxy(undefined);
    setDialogMode(mode);
    setDialogOpen(true);
  }

  function openEditDialog(proxy: ProxyPoolItem): void {
    setEditingProxy(proxy);
    setDialogMode('single');
    setDialogOpen(true);
  }

  function handleDialogOpenChange(open: boolean): void {
    if (open) {
      setDialogOpen(true);
      return;
    }

    closeDialog();
  }

  function closeDialog(): void {
    setDialogOpen(false);
    window.setTimeout(() => {
      setEditingProxy(undefined);
      setImportText('');
    }, 0);
  }
}

function formToProxyDraft(form: FormData): ProxyPoolDraft | undefined {
  const host = getFormText(form, 'host');
  const port = Number(getFormText(form, 'port'));
  if (!host || !Number.isInteger(port) || port <= 0) {
    return undefined;
  }

  return {
    host,
    password: getFormText(form, 'password'),
    port,
    protocol: toProtocol(getFormText(form, 'protocol')),
    remark: getFormText(form, 'remark') ?? '',
    tags: splitTags(getFormText(form, 'tags')),
    username: getFormText(form, 'username')
  };
}

function getFormText(form: FormData, name: string): string | undefined {
  const value = form.get(name);
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function toProtocol(value: string | undefined): ProxyPoolProtocol {
  if (value === 'https' || value === 'socks5') {
    return value;
  }
  return 'http';
}

function toStatusFilter(value: string): 'all' | ProxyPoolStatus {
  if (value === 'unchecked' || value === 'checking' || value === 'ok' || value === 'failed') {
    return value;
  }
  return 'all';
}

function splitTags(value: string | undefined): readonly string[] {
  return value?.split(',').map((tag) => tag.trim()).filter(Boolean) ?? [];
}

function matchProxy(proxy: ProxyPoolItem, keyword: string, statusFilter: 'all' | ProxyPoolStatus): boolean {
  const normalizedKeyword = keyword.trim().toLowerCase();
  const text = [proxy.host, proxy.remark, proxy.exitIp, proxy.region, ...proxy.tags].join(' ').toLowerCase();
  return (statusFilter === 'all' || proxy.status === statusFilter) && (!normalizedKeyword || text.includes(normalizedKeyword));
}

function toProxyItem(draft: ProxyPoolDraft, index: number): ProxyPoolItem {
  return {
    ...draft,
    id: `proxy-${Date.now()}-${index}`,
    profileCount: 0,
    status: 'unchecked'
  };
}

function withCheckResult(proxy: ProxyPoolItem, index: number): ProxyPoolItem {
  const failed = proxy.host.includes('bad') || proxy.port === 0;
  const regions = ['US / Los Angeles', 'SG / Singapore', 'JP / Tokyo', 'DE / Frankfurt'];
  return {
    ...proxy,
    exitIp: failed ? undefined : `154.21.${index + 10}.${index + 80}`,
    lastCheckedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    latency: failed ? undefined : 90 + index * 37,
    region: failed ? undefined : regions[index % regions.length],
    status: failed ? 'failed' : 'ok'
  };
}

function getProxyKey(proxy: ProxyPoolItem): string {
  return `${proxy.protocol}:${proxy.host}:${proxy.port}:${proxy.username ?? ''}:${proxy.password ?? ''}`;
}

function getDraftKey(draft: ProxyPoolDraft): string {
  return `${draft.protocol}:${draft.host}:${draft.port}:${draft.username ?? ''}:${draft.password ?? ''}`;
}

function copyProxy(proxy: ProxyPoolItem): void {
  const auth = proxy.username ? `${proxy.username}:${proxy.password ?? ''}@` : '';
  void navigator.clipboard?.writeText(`${proxy.protocol}://${auth}${proxy.host}:${proxy.port}`);
}
