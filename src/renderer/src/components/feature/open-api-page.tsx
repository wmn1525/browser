import { Button, Switch, Tag, message as antdMessage } from 'antd';
import { Copy, FileText, KeyRound, Play, RefreshCw, Square, Terminal } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import type { OpenApiInfo } from '../../../../shared/types';
import { buildEndpointDocs, buildOpenApiDocumentation, methodColor } from './open-api-docs';

/** 自动化 Open API 页面，展示本地调用地址、访问 Key 和可用接口。 */
export function OpenApiPage(): JSX.Element {
  const [info, setInfo] = useState<OpenApiInfo>();
  const [loading, setLoading] = useState(false);

  const apiKey = info?.apiKey ?? 'YOUR_API_KEY';
  const baseUrl = info?.baseUrl ?? 'http://127.0.0.1:20081/open-api';
  const endpoints = useMemo(() => buildEndpointDocs(baseUrl, apiKey), [apiKey, baseUrl]);
  const documentation = useMemo(() => buildOpenApiDocumentation(baseUrl, apiKey), [apiKey, baseUrl]);
  const quickGet = `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles"`;
  const quickPost = `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles/PROFILE_ID/start"`;

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

  async function copyDocumentation(): Promise<void> {
    await navigator.clipboard?.writeText(documentation);
    void antdMessage.success('API&MCP 文档已复制');
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      <div className="min-h-0 flex-1 overflow-auto bg-background p-6">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-xl font-semibold">API&MCP</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <Switch checked={info?.running ?? false} loading={loading} onChange={(checked) => void setServerRunning(checked)} />
                  <Button htmlType="button" loading={loading} onClick={() => void setServerRunning(true)} type="primary">
                    <Play className="size-4" />启动
                  </Button>
                  <Button htmlType="button" loading={loading} onClick={() => void setServerRunning(false)}>
                    <Square className="size-4" />停止
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button htmlType="button" loading={loading} onClick={() => void regenerateKey()}>
                  <KeyRound className="size-4" />重生成
                </Button>
                <Button htmlType="button" onClick={() => void refreshInfo()}>
                  <RefreshCw className="size-4" />刷新
                </Button>
                <Button htmlType="button" onClick={() => void copyDocumentation()}>
                  <FileText className="size-4" />复制文档
                </Button>
              </div>
            </div>

            <p className="mb-6 text-sm text-muted-foreground">外部脚本、MCP Server 和自动化工具通过本地地址控制 profile。</p>

            <div className="grid gap-4">
              <InfoField label="调用地址" onCopy={() => void copyText(info?.baseUrl)} value={info?.baseUrl ?? '未启动'} />
              <InfoField label="文档地址" onCopy={() => void copyText(info?.docsUrl)} value={info?.docsUrl ?? '未启动'} />
              <InfoField label="API Key" onCopy={() => void copyText(info?.apiKey)} value={info?.apiKey ?? '加载中'} />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Terminal className="size-5 text-muted-foreground" />
              <h3 className="font-semibold">快速调用</h3>
            </div>
            <div className="grid gap-4">
              <QuickCall label="GET Example" onCopy={() => void copyText(quickGet)} text={quickGet} />
              <QuickCall label="POST Example" onCopy={() => void copyText(quickPost)} text={quickPost} />
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h3 className="text-lg font-semibold">API 文档</h3>
              <p className="mt-2 text-sm text-muted-foreground">请求头支持 `X-API-Key` 或 `Authorization: Bearer`，启动 Chromium 后可读取 wsEndpoint 接入自动化。</p>
              <div className="mt-6 grid gap-8">
                {endpoints.map((endpoint) => (
                  <article className="grid gap-4" key={`${endpoint.method}-${endpoint.path}`}>
                    <div className="flex flex-wrap items-center gap-3">
                      <Tag color={methodColor(endpoint.method)}>{endpoint.method}</Tag>
                      <code className="rounded bg-muted px-2 py-1 text-xs">{endpoint.path}</code>
                      <span className="text-sm font-medium">{endpoint.title}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{endpoint.description}</p>
                    <div className="grid gap-4">
                      <CodeBlock title="请求示例" text={endpoint.request} />
                      <CodeBlock title="返回示例" text={endpoint.response} />
                    </div>
                  </article>
                ))}
              </div>
          </div>
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
    <label className="grid gap-2">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="flex min-w-0 items-center gap-2 rounded-lg border bg-muted/50 p-3">
        <span className="flex-1 truncate text-sm">{value}</span>
        <Button htmlType="button" onClick={onCopy} size="small" type="text"><Copy className="size-4" /></Button>
      </span>
    </label>
  );
}

function CodeBlock({ text, title }: { readonly text: string; readonly title?: string }): JSX.Element {
  return (
    <div className="grid gap-2">
      {title ? <div className="mb-1 text-xs font-medium text-muted-foreground">{title}</div> : null}
      <pre className="max-h-64 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-foreground"><code>{text}</code></pre>
    </div>
  );
}

function QuickCall({ label, onCopy, text }: {
  readonly label: string;
  readonly onCopy: () => void;
  readonly text: string;
}): JSX.Element {
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Button htmlType="button" onClick={onCopy} size="small" type="text"><Copy className="size-4" /></Button>
      </div>
      <pre className="overflow-auto rounded-lg bg-muted p-3 font-mono text-xs leading-5 text-muted-foreground"><code>{text}</code></pre>
    </div>
  );
}
