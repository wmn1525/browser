import { Check, Chrome, Download, Info, Laptop, Monitor, RefreshCw, Search, ShieldCheck, Smartphone, Terminal } from 'lucide-react';
import type { InputHTMLAttributes, PropsWithChildren } from 'react';
import { useState } from 'react';

import type { BrowserKernelInfo, ProfileDetail } from '../../../../shared/types';
import { cn } from '../../lib/utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Textarea } from '../ui/textarea';
import { browserKernelOptions } from './browser-kernel-options';
import { getOsVersionOptions, getPresetsForOs, osOptions } from './user-agent-options';

const searchEngines = ['Google', 'Bing', 'DuckDuckGo'];

interface BaseTabProps {
  readonly downloadingKernelId: string | undefined;
  readonly initialProfile?: ProfileDetail;
  readonly kernel: string;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly onDownloadKernel: (kernelId: string) => void;
  readonly os: string;
  readonly osVersion: string;
  readonly setKernel: (value: string) => void;
  readonly setOs: (value: string) => void;
  readonly setOsVersion: (value: string) => void;
  readonly setUserAgent: (value: string) => void;
  readonly setUaPreset: (value: string) => void;
  readonly uaPresetId: string;
  readonly userAgent: string;
}

export function BaseTab({
  downloadingKernelId,
  initialProfile,
  kernel,
  kernels,
  onDownloadKernel,
  os,
  osVersion,
  setKernel,
  setOs,
  setOsVersion,
  setUserAgent,
  setUaPreset,
  uaPresetId,
  userAgent
}: BaseTabProps): JSX.Element {
  const uaOptions = getPresetsForOs(os);

  return (
    <FormCard icon={<Info className="size-5" />} title="基础信息">
      <Field defaultValue={initialProfile?.name} label="名称" maxLength={15} name="name" placeholder="请输入名称" required />
      <SelectRow label="分组" name="groupId" options={['未分组']} required />
      <Notice>注意：环境运行后，中途修改内核版本，可能导致缓存兼容性问题。</Notice>
      <OsPicker os={os} setOs={(value) => {
        setOs(value);
      }} />
      <SelectRow label="系统版本" name="osVersion" onValueChange={setOsVersion} options={getOsVersionOptions(os)} required value={osVersion} />
      <KernelSelect downloadingKernelId={downloadingKernelId} kernel={kernel} kernels={kernels} onDownloadKernel={onDownloadKernel} setKernel={setKernel} />
      <UaPresetSelect setUaPreset={setUaPreset} uaOptions={uaOptions} uaPresetId={uaPresetId} />
      <TextareaRow label="User-Agent" name="userAgent" onChange={(value) => setUserAgent(value)} value={userAgent} />
      <TextareaRow defaultValue={initialProfile?.cookiesText} hint="请输入 JSON 数组格式，可后续接入 Cookie 合并。" label="Cookie" name="cookiesText" />
      <SelectRow label="默认搜索引擎" name="searchEngine" options={searchEngines} />
    </FormCard>
  );
}

function KernelSelect({ downloadingKernelId, kernel, kernels, onDownloadKernel, setKernel }: {
  readonly downloadingKernelId: string | undefined;
  readonly kernel: string;
  readonly kernels: readonly BrowserKernelInfo[];
  readonly onDownloadKernel: (kernelId: string) => void;
  readonly setKernel: (value: string) => void;
}): JSX.Element {
  const selected = browserKernelOptions.find((option) => option.id === kernel) ?? browserKernelOptions[0];
  const [open, setOpen] = useState(false);

  return (
    <Label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary"><span className="mr-1 text-destructive">*</span>浏览器内核</span>
      <input name="browserKernel" type="hidden" value={kernel} />
      <DropdownMenu onOpenChange={setOpen} open={open}>
        <DropdownMenuTrigger asChild>
          <button className="flex h-9 w-full items-center justify-between rounded-lg bg-muted px-3 text-left text-sm outline-none focus:ring-1 focus:ring-ring" type="button">
            <span>{selected.label}</span>
            <span className="text-xs text-muted-foreground">选择内核</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-96 w-[420px] overflow-y-auto">
          {browserKernelOptions.map((option) => (
            <KernelRow
              downloading={downloadingKernelId === option.id}
              key={option.id}
              onDownload={() => onDownloadKernel(option.id)}
              onSelect={() => {
                setKernel(option.id);
                setOpen(false);
              }}
              option={option}
              selected={kernel === option.id}
              state={kernels.find((item) => item.id === option.id)}
            />
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </Label>
  );
}

function KernelRow({ downloading, onDownload, onSelect, option, selected, state }: {
  readonly downloading: boolean;
  readonly onDownload: () => void;
  readonly onSelect: () => void;
  readonly option: (typeof browserKernelOptions)[number];
  readonly selected: boolean;
  readonly state: BrowserKernelInfo | undefined;
}): JSX.Element {
  const installed = state?.isInstalled ?? option.id === 'system-chrome';
  const version = state?.version !== '本机已安装' && state?.version ? state.version : option.version;
  if (installed) {
    return (
      <button className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-muted" onClick={onSelect} type="button">
        <KernelMeta option={option} version={version} />
        {selected ? <Check className="size-4 text-primary" /> : <span className="text-[11px] text-primary">已下载</span>}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-md px-2 py-2 text-sm text-muted-foreground opacity-70">
      <KernelMeta option={option} version={version} />
      <Button disabled={downloading} onClick={onDownload} size="sm" type="button" variant="outline">
        <Download className="size-3.5" />{downloading ? '下载中' : '下载'}
      </Button>
    </div>
  );
}

function KernelMeta({ option, version }: {
  readonly option: (typeof browserKernelOptions)[number];
  readonly version: string;
}): JSX.Element {
  return (
    <span className="grid gap-0.5">
      <span className="font-medium">{option.label}</span>
      <span className="text-[11px] text-muted-foreground">{option.description} / {version}</span>
    </span>
  );
}

function UaPresetSelect({ setUaPreset, uaOptions, uaPresetId }: {
  readonly setUaPreset: (value: string) => void;
  readonly uaOptions: ReturnType<typeof getPresetsForOs>;
  readonly uaPresetId: string;
}): JSX.Element {
  return (
    <Label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">UA 预设</span>
      <Select onValueChange={setUaPreset} value={uaPresetId}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent className="max-h-80">
          {uaOptions.map((preset) => (
            <SelectItem key={preset.id} value={preset.id}>{preset.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Label>
  );
}

export function AccountTab({ initialProfile }: { readonly initialProfile?: ProfileDetail }): JSX.Element {
  return (
    <FormCard icon={<Search className="size-5" />} title="账号平台">
      <SelectRow defaultValue={initialProfile?.accountPlatform ?? '自定义平台'} label="平台" name="accountPlatform" options={['自定义平台', 'TikTok', 'Google', 'Facebook', 'Amazon']} />
      <Field defaultValue={initialProfile?.accountName} label="账号标识" name="accountName" placeholder="邮箱 / 手机号 / 店铺名" />
      <TextareaRow hint="备注只保存在本地 profile JSON，不参与指纹计算。" label="账号备注" name="accountRemark" />
    </FormCard>
  );
}

export function AppsTab({ initialProfile, loadImages, loadVideos, setLoadImages, setLoadVideos }: {
  readonly initialProfile?: ProfileDetail;
  readonly loadImages: boolean;
  readonly loadVideos: boolean;
  readonly setLoadImages: (value: boolean) => void;
  readonly setLoadVideos: (value: boolean) => void;
}): JSX.Element {
  return (
    <FormCard icon={<Chrome className="size-5" />} title="应用配置">
      <Field defaultValue={initialProfile?.startUrls.join('\n')} label="启动页" name="urls" placeholder="https://browserscan.net" />
      <SwitchRow checked={loadImages} label="图片加载" name="loadImages" onCheckedChange={setLoadImages} />
      <SwitchRow checked={loadVideos} label="视频加载" name="loadVideos" onCheckedChange={setLoadVideos} />
      <Notice>扩展、书签和脚本模板后续会在应用中心统一管理，创建时可从模板带入。</Notice>
    </FormCard>
  );
}

export function SummaryPanel({ onRandomize, summary }: {
  readonly onRandomize: () => void;
  readonly summary: {
    readonly kernel: string;
    readonly loadImages: boolean;
    readonly loadVideos: boolean;
    readonly os: string;
    readonly osVersion: string;
    readonly userAgent: string;
  };
}): JSX.Element {
  return (
    <aside className="w-[300px] shrink-0 overflow-y-auto border-l bg-muted/60 p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">概要</h3>
        <Button onClick={onRandomize} size="sm" type="button"><RefreshCw className="size-4" />生成新指纹</Button>
      </div>
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-4 flex items-center gap-3">
          <div className="grid size-16 place-items-center rounded-lg bg-blue-100 text-primary"><Laptop className="size-9" /></div>
          <div><p className="font-bold">{summary.os}</p><p className="text-xs text-muted-foreground">{summary.osVersion}</p></div>
        </div>
        <SummaryRow label="浏览器内核" value={summary.kernel} />
        <SummaryBlock label="User-Agent" value={summary.userAgent} />
        <SummaryRow label="接受语言" value="基于配置" />
        <SummaryRow label="时区" value="基于配置 / IP" />
        <SummaryRow label="分辨率" value="2195 × 1235" />
        <SummaryRow label="图片加载" value={summary.loadImages ? '启用' : '禁用'} />
        <SummaryRow label="视频加载" value={summary.loadVideos ? '启用' : '禁用'} />
        <SummaryBlock label="WebGL元数据" value="ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 Direct3D11)" />
      </div>
      <p className="mt-3 text-center text-[11px] text-muted-foreground">可前往应用中心保存为默认指纹模板。</p>
    </aside>
  );
}

export function FormFooter({ onCancel }: { readonly onCancel: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between border-t bg-card px-6 py-4">
      <div className="flex gap-3">
        <Button onClick={onCancel} type="button" variant="outline">取消</Button>
        <Button type="submit">保存</Button>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="flex items-center gap-1 text-primary"><ShieldCheck className="size-4" />初始化完成</span>
        <Badge>16/16</Badge>
      </div>
    </div>
  );
}

export function FormCard({ children, icon, title }: PropsWithChildren<{ readonly icon: JSX.Element; readonly title: string }>): JSX.Element {
  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex items-center gap-2 border-b px-4 py-3 text-secondary">{icon}<h3 className="font-semibold text-foreground">{title}</h3></div>
      <div className="grid gap-5 p-6">{children}</div>
    </section>
  );
}

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string;
}

function Field({ className, label, ...props }: FieldProps): JSX.Element {
  return (
    <Label className={cn('grid grid-cols-[128px_1fr] items-center gap-3', className)}>
      <span className="text-sm text-secondary">{label}</span>
      <Input {...props} />
    </Label>
  );
}

function SelectRow({ defaultValue, label, name, onValueChange, options, required, value }: {
  readonly defaultValue?: string;
  readonly label: string;
  readonly name: string;
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly string[];
  readonly required?: boolean;
  readonly value?: string;
}): JSX.Element {
  return (
    <Label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{required ? <span className="mr-1 text-destructive">*</span> : null}{label}</span>
      <Select defaultValue={value === undefined ? defaultValue ?? options[0] : undefined} name={name} onValueChange={onValueChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    </Label>
  );
}

function OsPicker({ os, setOs }: { readonly os: string; readonly setOs: (value: string) => void }): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-start gap-3">
      <span className="pt-3 text-sm text-secondary"><span className="mr-1 text-destructive">*</span>操作系统</span>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <input name="os" type="hidden" value={os} />
        {osOptions.map((option) => {
          const Icon = getOsIcon(option.label);
          const active = os === option.label;
          return (
            <button className={cn('relative flex flex-col items-center gap-2 rounded-lg border p-3 text-xs hover:bg-muted', active && 'border-primary bg-primary/5 text-primary')} key={option.label} onClick={() => setOs(option.label)} type="button">
              <Icon className="size-5" />{option.label}
              {option.label === 'Windows' ? <span className="absolute -top-2 right-0 rounded-full bg-orange-400 px-1.5 py-0.5 text-[9px] text-white">推荐</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function getOsIcon(os: string): typeof Laptop {
  if (os === 'Mac') return Monitor;
  if (os === 'Linux') return Terminal;
  if (os === 'Android' || os === 'iOS') return Smartphone;
  return Laptop;
}

function TextareaRow({ defaultValue, hint, label, name, onChange, value }: {
  readonly defaultValue?: string;
  readonly hint?: string;
  readonly label: string;
  readonly name: string;
  readonly onChange?: (value: string) => void;
  readonly value?: string;
}): JSX.Element {
  return (
    <Label className="grid grid-cols-[128px_1fr] items-start gap-3">
      <span className="pt-2 text-sm text-secondary">{label}</span>
      <div>
        <Textarea defaultValue={defaultValue} name={name} onChange={(event) => onChange?.(event.target.value)} value={value} />
        {hint ? <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
    </Label>
  );
}

function SwitchRow({ checked, label, name, onCheckedChange }: {
  readonly checked: boolean;
  readonly label: string;
  readonly name: string;
  readonly onCheckedChange: (checked: boolean) => void;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <Switch checked={checked} name={name} onCheckedChange={onCheckedChange} />
    </div>
  );
}

export function Notice({ children }: PropsWithChildren): JSX.Element {
  return <div className="ml-32 flex gap-2 rounded-lg border border-blue-100 bg-blue-50/70 p-3 text-xs text-primary"><Info className="size-4" />{children}</div>;
}

function SummaryRow({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className="flex justify-between border-b py-2 text-xs"><span className="text-muted-foreground">{label}</span><span className="font-medium">{value}</span></div>;
}

function SummaryBlock({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return <div className="py-2 text-xs"><p className="mb-1 text-muted-foreground">{label}</p><p className="rounded bg-muted p-2 leading-relaxed">{value}</p></div>;
}
