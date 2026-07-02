import { Input, Select, type InputProps } from 'antd';
import { ShieldCheck } from 'lucide-react';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

import type { ProfileDetail, ProxyPoolItem, ProxyType } from '../../../../shared/types';

interface ProxyTabProps {
  readonly initialProfile?: ProfileDetail;
}

/** 浏览器 profile 的代理配置页，可从本地代理池快速带入配置。 */
export function ProxyTab({ initialProfile }: ProxyTabProps): JSX.Element {
  const [proxyPool, setProxyPool] = useState<readonly ProxyPoolItem[]>([]);
  const [proxyType, setProxyType] = useState<ProxyType>(initialProfile?.proxy?.type ?? 'http');
  const [proxyHost, setProxyHost] = useState(initialProfile?.proxy?.host ?? '');
  const [proxyPort, setProxyPort] = useState(initialProfile?.proxy?.port ? String(initialProfile.proxy.port) : '');
  const [proxyUser, setProxyUser] = useState(initialProfile?.proxy?.username ?? '');
  const [proxyPass, setProxyPass] = useState(initialProfile?.proxy?.password ?? '');

  useEffect(() => {
    void window.browserShell.listProxyPool().then(setProxyPool);
  }, []);

  function selectProxy(proxyId: string): void {
    if (proxyId === 'direct') {
      setProxyHost('');
      setProxyPort('');
      setProxyUser('');
      setProxyPass('');
      return;
    }

    const proxy = proxyPool.find((item) => item.id === proxyId);
    if (!proxy) {
      return;
    }

    setProxyType(proxy.protocol);
    setProxyHost(proxy.host);
    setProxyPort(String(proxy.port));
    setProxyUser(proxy.username ?? '');
    setProxyPass(proxy.password ?? '');
  }

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-secondary">
        <ShieldCheck className="size-5" />
        <h3 className="font-semibold text-foreground">代理配置</h3>
      </div>
      <div className="grid gap-5 p-6">
        <ProxyPoolSelect onSelect={selectProxy} proxyPool={proxyPool} />
        <SelectRow label="代理协议" name="proxyType" onValueChange={(value) => setProxyType(value as ProxyType)} options={['http', 'https', 'socks5']} value={proxyType} />
        <Field label="代理 Host" name="proxyHost" onChange={(event) => setProxyHost(event.target.value)} placeholder="proxy.example.com" value={proxyHost} />
        <Field inputMode="numeric" label="代理端口" name="proxyPort" onChange={(event) => setProxyPort(event.target.value)} placeholder="8080" value={proxyPort} />
        <Field label="用户名" name="proxyUser" onChange={(event) => setProxyUser(event.target.value)} value={proxyUser} />
        <Field label="密码" name="proxyPass" onChange={(event) => setProxyPass(event.target.value)} type="password" value={proxyPass} />
        <Notice>可从代理池选择代理，也可手动填写；保存后代理会写入当前浏览器环境。</Notice>
      </div>
    </section>
  );
}

function ProxyPoolSelect({ onSelect, proxyPool }: {
  readonly onSelect: (proxyId: string) => void;
  readonly proxyPool: readonly ProxyPoolItem[];
}): JSX.Element {
  return (
    <label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">代理池</span>
      <Select
        onChange={onSelect}
        options={[
          { label: '不使用代理', value: 'direct' },
          ...proxyPool.map((proxy) => ({ label: `${proxy.host}:${proxy.port} / ${proxy.protocol.toUpperCase()}`, value: proxy.id }))
        ]}
        placeholder="从本地代理池选择"
      />
    </label>
  );
}

interface FieldProps extends InputProps {
  readonly label: string;
}

function Field({ className, label, ...props }: FieldProps): JSX.Element {
  return (
    <label className={['grid grid-cols-[128px_1fr] items-center gap-3', className].filter(Boolean).join(' ')}>
      <span className="text-sm text-secondary">{label}</span>
      <Input {...props} />
    </label>
  );
}

function SelectRow({ label, name, onValueChange, options, value }: {
  readonly label: string;
  readonly name: string;
  readonly onValueChange: (value: string) => void;
  readonly options: readonly string[];
  readonly value: string;
}): JSX.Element {
  return (
    <label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <input name={name} type="hidden" value={value} />
      <Select onChange={onValueChange} options={options.map((option) => ({ label: option, value: option }))} value={value} />
    </label>
  );
}

function Notice({ children }: PropsWithChildren): JSX.Element {
  return <div className="ml-32 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-primary">{children}</div>;
}
