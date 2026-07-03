import { Button, Divider, Input, Switch, Tag, message as antdMessage } from 'antd';
import { Copy, FileText, KeyRound, Play, RefreshCw, Square } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { OpenApiInfo } from '../../../../shared/types';

interface EndpointDoc {
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly title: string;
  readonly description: string;
  readonly request: string;
  readonly response: string;
}

const startProfileOpenApiPath = '/open-api/profiles/PROFILE_ID/start';

/** 自动化 Open API 页面，展示本地调用地址、访问 Key 和可用接口。 */
export function OpenApiPage(): JSX.Element {
  const [info, setInfo] = useState<OpenApiInfo>();
  const [loading, setLoading] = useState(false);

  const apiKey = info?.apiKey ?? 'YOUR_API_KEY';
  const baseUrl = info?.baseUrl ?? 'http://127.0.0.1:18000/open-api';
  const originUrl = baseUrl.replace(/\/open-api$/, '');
  const endpoints = useMemo(() => buildEndpointDocs(baseUrl, apiKey), [apiKey, baseUrl]);

  useEffect(() => {
    void refreshInfo();
  }, []);

  async function refreshInfo(): Promise<void> {
    setInfo(await window.browserShell.getOpenApiInfo());
  }

  async function setServerRunning(running: boolean): Promise<void> {
    setLoading(true);
    try {
      setInfo(running ? await window.browserShell.startOpenApiServer() : await window.browserShell.stopOpenApiServer());
      void antdMessage.success(running ? 'Open API 已启动' : 'Open API 已停止');
    } finally {
      setLoading(false);
    }
  }

  async function regenerateKey(): Promise<void> {
    setLoading(true);
    try {
      setInfo(await window.browserShell.regenerateOpenApiKey());
      void antdMessage.success('API Key 已更新');
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string | undefined): Promise<void> {
    if (!value) {
      return;
    }
    await navigator.clipboard?.writeText(value);
    void antdMessage.success('已复制');
  }

  return (
    <section className="flex min-h-0 flex-1 overflow-hidden bg-background">
      <aside className="w-[380px] shrink-0 overflow-auto border-r bg-card p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">本地 API</h2>
            <p className="mt-1 text-sm text-muted-foreground">外部脚本通过本机地址控制 profile。</p>
          </div>
          <Switch checked={info?.running ?? false} loading={loading} onChange={(checked) => void setServerRunning(checked)} />
        </div>

        <div className="grid gap-4">
          <InfoField label="调用地址" onCopy={() => void copyText(info?.baseUrl)} value={info?.baseUrl ?? '未启动'} />
          <InfoField label="文档地址" onCopy={() => void copyText(info?.docsUrl)} value={info?.docsUrl ?? '未启动'} />
          <InfoField label="API Key" onCopy={() => void copyText(info?.apiKey)} value={info?.apiKey ?? '加载中'} />
          <div className="flex gap-2">
            <Button htmlType="button" loading={loading} onClick={() => void setServerRunning(true)} type="primary">
              <Play className="size-4" />启动
            </Button>
            <Button htmlType="button" loading={loading} onClick={() => void setServerRunning(false)}>
              <Square className="size-4" />停止
            </Button>
            <Button htmlType="button" loading={loading} onClick={() => void regenerateKey()}>
              <KeyRound className="size-4" />重生成
            </Button>
          </div>
        </div>

        <Divider />

        <div className="grid gap-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4" />快速调用</h3>
          <CodeBlock text={`curl -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles"`} />
          <CodeBlock text={`curl -X POST -H "X-API-Key: ${apiKey}" "${originUrl}${startProfileOpenApiPath}"`} />
        </div>
      </aside>

      <div className="min-w-0 flex-1 overflow-auto p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">API 文档</h2>
            <p className="mt-1 text-sm text-muted-foreground">请求头支持 `X-API-Key` 或 `Authorization: Bearer`。</p>
          </div>
          <Button htmlType="button" onClick={() => void refreshInfo()}>
            <RefreshCw className="size-4" />刷新
          </Button>
        </div>

        <div className="grid gap-3">
          {endpoints.map((endpoint) => (
            <article className="rounded-lg border bg-card p-4" key={`${endpoint.method}-${endpoint.path}`}>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Tag color={methodColor(endpoint.method)}>{endpoint.method}</Tag>
                <code className="rounded bg-muted px-2 py-1 text-xs">{endpoint.path}</code>
                <span className="font-medium">{endpoint.title}</span>
              </div>
              <p className="mb-3 text-sm text-muted-foreground">{endpoint.description}</p>
              <div className="grid gap-3 xl:grid-cols-2">
                <CodeBlock title="请求示例" text={endpoint.request} />
                <CodeBlock title="返回示例" text={endpoint.response} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function InfoField({ label, onCopy, value }: {
  readonly label: string;
  readonly onCopy: () => void;
  readonly value: string;
}): JSX.Element {
  return (
    <label className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        readOnly
        suffix={<Button htmlType="button" onClick={onCopy} size="small" type="text"><Copy className="size-4" /></Button>}
        value={value}
      />
    </label>
  );
}

function CodeBlock({ text, title }: { readonly text: string; readonly title?: string }): JSX.Element {
  return (
    <div>
      {title ? <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div> : null}
      <pre className="max-h-64 overflow-auto rounded-md bg-muted p-3 text-xs leading-5 text-foreground"><code>{text}</code></pre>
    </div>
  );
}

function buildEndpointDocs(baseUrl: string, apiKey: string): readonly EndpointDoc[] {
  return [
    doc('GET', '/health', '检查服务', '确认本地 Open API 服务可用。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/health"`, { status: 'ok' }),
    doc('GET', '/profiles', '读取 profile', '返回本地保存的 profile 列表和运行状态。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles"`, [{ id: 'profile-id', name: 'Demo', isRunning: false }]),
    doc('POST', '/profiles', '创建或更新 profile', '请求体使用当前项目的 ProfileDraft 字段；传入 id 时执行更新或创建。', `curl -X POST "${baseUrl}/profiles" -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" -d "{\\"name\\":\\"Demo\\",\\"startUrls\\":[\\"https://example.com\\"],\\"tags\\":[]}"`, { id: 'profile-id', name: 'Demo' }),
    doc('POST', '/profiles/{profile_id}/start', '启动 profile', '启动 Chromium 时返回 port、debug_port、debug_url 和 wsEndpoint。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles/PROFILE_ID/start"`, { profileId: 'PROFILE_ID', port: 9222, debug_port: 9222, debug_url: 'http://127.0.0.1:9222' }),
    doc('POST', '/profiles/{profile_id}/stop', '关闭 profile', '关闭指定 profile 对应的浏览器进程。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles/PROFILE_ID/stop"`, { profileId: 'PROFILE_ID', status: 'stopped' }),
    doc('GET', '/groups', '读取分组', '返回本地 profile 分组列表。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/groups"`, [{ id: 'group-id', name: 'Group' }]),
    doc('POST', '/groups/{group_id}/start', '按分组启动', '批量启动某个分组下的 profile，未分组使用 `_ungrouped_`。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/groups/GROUP_ID/start"`, [{ profileId: 'profile-id', port: 9222 }]),
    doc('GET', '/proxies', '读取代理池', '返回代理管理中保存的代理列表。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/proxies"`, [{ id: 'proxy-id', protocol: 'http', host: '127.0.0.1', port: 7890 }]),
    doc('GET', '/extensions?engine=chromium', '读取扩展', '返回应用中心扩展列表，可按 chromium/firefox 过滤。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/extensions?engine=chromium"`, [{ id: 'extension-id', engine: 'chromium', enabled: true }]),
    doc('PUT', '/extensions/{extension_id}', '更新扩展', '修改扩展显示名或全局启用状态。', `curl -X PUT "${baseUrl}/extensions/EXTENSION_ID" -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" -d "{\\"enabled\\":false}"`, { id: 'extension-id', enabled: false }),
    doc('DELETE', '/extensions/{extension_id}', '删除扩展', '删除扩展元数据和本地文件，并清理 profile 禁用记录。', `curl -X DELETE -H "X-API-Key: ${apiKey}" "${baseUrl}/extensions/EXTENSION_ID"`, { ok: true })
  ];
}

function doc(
  method: EndpointDoc['method'],
  path: string,
  title: string,
  description: string,
  request: string,
  response: object
): EndpointDoc {
  return { method, path, title, description, request, response: JSON.stringify(response, null, 2) };
}

function methodColor(method: EndpointDoc['method']): string {
  if (method === 'GET') return 'green';
  if (method === 'POST') return 'blue';
  if (method === 'DELETE') return 'red';
  return 'orange';
}
