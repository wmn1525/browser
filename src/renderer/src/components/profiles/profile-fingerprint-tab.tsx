import { Monitor, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ProfileDetail } from '../../../../shared/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  batteryStateOptions,
  bluetoothStateOptions,
  cpuOptions,
  fingerprintModeOptions,
  gpuOptions,
  languageOptions,
  memoryOptions,
  networkStateOptions,
  osCompatibility,
  osDefaults,
  platformOptions,
  screenOptions,
  timezoneOptions
} from './profile-fingerprint-options';
import type { GpuOption, Option, OsCompatibility, OsFingerprintDefault, ScreenOption } from './profile-fingerprint-options';
import { FormCard, Notice } from './profile-form-fields';

interface FingerprintValues {
  readonly platform: string;
  readonly language: string;
  readonly timezone: string;
  readonly cpu: string;
  readonly memory: string;
  readonly screen: ScreenOption;
  readonly gpu: GpuOption;
  readonly hstsMode: string;
  readonly hstsValue: string;
  readonly webglMode: string;
  readonly webglValue: string;
  readonly canvasMode: string;
  readonly canvasValue: string;
  readonly pluginsMode: string;
  readonly pluginsValue: string;
  readonly rectsMode: string;
  readonly rectsValue: string;
  readonly fontsMode: string;
  readonly fontsValue: string;
  readonly batteryState: string;
  readonly bluetoothState: string;
  readonly networkState: string;
}

/** 指纹页只呈现当前 DTO 能保存的字段，避免产生无效配置。 */
export function FingerprintTab({ initialProfile, os, randomSeed }: {
  readonly initialProfile?: ProfileDetail;
  readonly os: string;
  readonly randomSeed: number;
}): JSX.Element {
  const firstRender = useRef(true);
  const compatibility = getCompatibility(os);
  const platformChoices = useMemo(() => getPlatformOptions(compatibility), [compatibility]);
  const screenChoices = useMemo(() => getScreenOptions(compatibility), [compatibility]);
  const gpuChoices = useMemo(() => getGpuOptions(compatibility), [compatibility]);
  const [values, setValues] = useState(() => getInitialValues(initialProfile, os));

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    setValues(getDefaultValues(os));
  }, [os]);

  useEffect(() => {
    if (randomSeed > 0) {
      setValues(getRandomValues(os));
    }
  }, [os, randomSeed]);

  return (
    <FormCard icon={<Monitor className="size-5" />} title="指纹信息">
      <Notice>优先保持语言、时区、平台与代理地区一致；GPU 和设备参数不确定时使用常见预设。</Notice>
      <div className="ml-32 flex justify-end">
        <Button onClick={() => setValues(getRandomValues(os))} size="sm" type="button"><RefreshCw className="size-4" />随机指纹</Button>
      </div>
      <Section title="语言与时区">
        <SelectField label="系统平台" name="platform" onChange={(platform) => setValues({ ...values, platform })} options={platformChoices} value={values.platform} />
        <SelectField label="接受语言" name="language" onChange={(language) => setValues({ ...values, language })} options={languageOptions} value={values.language} />
        <SelectField label="时区" name="timezone" onChange={(timezone) => setValues({ ...values, timezone })} options={timezoneOptions} value={values.timezone} />
      </Section>
      <Section title="设备与显示">
        <SelectField label="CPU 核心数" name="cpu" onChange={(cpu) => setValues({ ...values, cpu })} options={cpuOptions} value={values.cpu} />
        <SelectField label="内存大小" name="memory" onChange={(memory) => setValues({ ...values, memory })} options={memoryOptions} value={values.memory} />
        <ResolutionSelect onChange={(screen) => setValues({ ...values, screen })} options={screenChoices} screen={values.screen} />
      </Section>
      <Section title="显卡图形">
        <FingerprintModeRow label="显卡及驱动程序指纹" mode={values.webglMode} modeName="webglMode" onChange={(webglMode) => setValues({ ...values, webglMode })} value={values.webglValue} valueName="webglValue" />
        <GpuSelect gpu={values.gpu} onChange={(gpu) => setValues({ ...values, gpu })} options={gpuChoices} />
        <ReadonlyField label="显卡厂商" value={values.gpu.vendor} />
        <ReadonlyField label="显卡渲染器" value={values.gpu.renderer} />
      </Section>
      <Section title="高级指纹">
        <FingerprintModeRow label="HSTS 协议指纹" mode={values.hstsMode} modeName="hstsMode" onChange={(hstsMode) => setValues({ ...values, hstsMode })} value={values.hstsValue} valueName="hstsValue" />
        <FingerprintModeRow label="二维图像绘制指纹" mode={values.canvasMode} modeName="canvasMode" onChange={(canvasMode) => setValues({ ...values, canvasMode })} value={values.canvasValue} valueName="canvasValue" />
        <FingerprintModeRow label="浏览器插件指纹" mode={values.pluginsMode} modeName="pluginsMode" onChange={(pluginsMode) => setValues({ ...values, pluginsMode })} value={values.pluginsValue} valueName="pluginsValue" />
        <FingerprintModeRow label="视窗及浏览器特征指纹" mode={values.rectsMode} modeName="rectsMode" onChange={(rectsMode) => setValues({ ...values, rectsMode })} value={values.rectsValue} valueName="rectsValue" />
        <FingerprintModeRow label="字体及输入设备指纹" mode={values.fontsMode} modeName="fontsMode" onChange={(fontsMode) => setValues({ ...values, fontsMode })} value={values.fontsValue} valueName="fontsValue" />
      </Section>
      <Section title="移动与连接">
        <SelectField label="电池配置" name="batteryState" onChange={(batteryState) => setValues({ ...values, batteryState })} options={batteryStateOptions} value={values.batteryState} />
        <SelectField label="蓝牙状态" name="bluetoothState" onChange={(bluetoothState) => setValues({ ...values, bluetoothState })} options={bluetoothStateOptions} value={values.bluetoothState} />
        <SelectField label="网络状态" name="networkState" onChange={(networkState) => setValues({ ...values, networkState })} options={networkStateOptions} value={values.networkState} />
      </Section>
    </FormCard>
  );
}

function FingerprintModeRow({ label, mode, modeName, onChange, value, valueName }: {
  readonly label: string;
  readonly mode: string;
  readonly modeName: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
  readonly valueName: string;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <div className="grid grid-cols-[minmax(160px,220px)_1fr] gap-3">
        <Select name={modeName} onValueChange={onChange} value={mode}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{fingerprintModeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
        </Select>
        <Input name={valueName} readOnly value={mode === 'random' ? value : 'native'} />
      </div>
    </div>
  );
}

function Section({ children, title }: { readonly children: ReactNode; readonly title: string }): JSX.Element {
  return (
    <div className="grid gap-4 border-t pt-4 first:border-t-0 first:pt-0">
      <h4 className="text-sm font-semibold text-foreground">{title}</h4>
      {children}
    </div>
  );
}

function SelectField({ label, name, onChange, options, value }: {
  readonly label: string;
  readonly name: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly Option[];
  readonly value: string;
}): JSX.Element {
  return (
    <Label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <Select name={name} onValueChange={onChange} value={value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </Label>
  );
}

function ResolutionSelect({ onChange, options, screen }: {
  readonly onChange: (screen: ScreenOption) => void;
  readonly options: readonly ScreenOption[];
  readonly screen: ScreenOption;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">分辨率</span>
      <input name="screenWidth" type="hidden" value={screen.width} />
      <input name="screenHeight" type="hidden" value={screen.height} />
      <Select onValueChange={(value) => onChange(findScreen(options, value))} value={screen.value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function GpuSelect({ gpu, onChange, options }: {
  readonly gpu: GpuOption;
  readonly onChange: (gpu: GpuOption) => void;
  readonly options: readonly GpuOption[];
}): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">显卡预设</span>
      <input name="webglVendor" type="hidden" value={gpu.vendor} />
      <input name="webglRenderer" type="hidden" value={gpu.renderer} />
      <Select onValueChange={(value) => onChange(findGpu(options, value))} value={gpu.value}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function ReadonlyField({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <Label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <Input readOnly value={value} />
    </Label>
  );
}

function getInitialValues(initialProfile: ProfileDetail | undefined, os: string): FingerprintValues {
  const defaults = getDefaultValues(os);
  const compatibility = getCompatibility(os);
  const platform = initialProfile?.fingerprint?.platform;
  const language = initialProfile?.fingerprint?.language;
  const timezone = initialProfile?.timezone;
  const cpu = String(initialProfile?.fingerprint?.hardwareConcurrency ?? defaults.cpu);
  const memory = String(initialProfile?.fingerprint?.deviceMemory ?? defaults.memory);
  const screen = findScreenBySize(getScreenOptions(compatibility), initialProfile) ?? defaults.screen;
  const gpu = findGpuByMeta(getGpuOptions(compatibility), initialProfile) ?? defaults.gpu;
  const hstsMode = randomMode(initialProfile?.fingerprint?.hstsMode, defaults.hstsMode);
  const webglMode = initialProfile?.fingerprint?.webglMode;
  const canvasMode = randomMode(initialProfile?.fingerprint?.canvasMode, defaults.canvasMode);
  const pluginsMode = randomMode(initialProfile?.fingerprint?.pluginsMode, defaults.pluginsMode);
  const rectsMode = initialProfile?.fingerprint?.rectsMode;
  const fontsMode = initialProfile?.fingerprint?.fontsMode;
  const batteryState = initialProfile?.fingerprint?.batteryState;
  const bluetoothState = initialProfile?.fingerprint?.bluetoothState;
  const networkState = initialProfile?.fingerprint?.networkState;

  return {
    platform: compatibility.platforms.includes(platform ?? '') ? platform ?? defaults.platform : defaults.platform,
    language: hasOption(languageOptions, language) ? language ?? defaults.language : defaults.language,
    timezone: hasOption(timezoneOptions, timezone) ? timezone ?? defaults.timezone : defaults.timezone,
    cpu: hasOption(cpuOptions, cpu) ? cpu : defaults.cpu,
    memory: hasOption(memoryOptions, memory) ? memory : defaults.memory,
    screen,
    gpu,
    hstsMode,
    hstsValue: initialProfile?.fingerprint?.hstsValue ?? randomHex(8),
    webglMode: randomMode(webglMode, defaults.webglMode),
    webglValue: initialProfile?.fingerprint?.webglValue ?? randomHex(16),
    canvasMode,
    canvasValue: initialProfile?.fingerprint?.canvasValue ?? randomDecimal(),
    pluginsMode,
    pluginsValue: initialProfile?.fingerprint?.pluginsValue ?? randomHex(16),
    rectsMode: randomMode(rectsMode, defaults.rectsMode),
    rectsValue: initialProfile?.fingerprint?.rectsValue ?? randomHex(16),
    fontsMode: randomMode(fontsMode, defaults.fontsMode),
    fontsValue: initialProfile?.fingerprint?.fontsValue ?? randomHex(16),
    batteryState: hasOption(batteryStateOptions, batteryState) ? batteryState ?? defaults.batteryState : defaults.batteryState,
    bluetoothState: hasOption(bluetoothStateOptions, bluetoothState) ? bluetoothState ?? defaults.bluetoothState : defaults.bluetoothState,
    networkState: hasOption(networkStateOptions, networkState) ? networkState ?? defaults.networkState : defaults.networkState
  };
}

function getDefaultValues(os: string): FingerprintValues {
  const defaults = getOsDefaults(os);
  const compatibility = getCompatibility(os);
  return {
    platform: defaults.platform,
    language: defaults.language,
    timezone: defaults.timezone,
    cpu: defaults.cpu,
    memory: defaults.memory,
    screen: findScreen(getScreenOptions(compatibility), defaults.screen),
    gpu: findGpu(getGpuOptions(compatibility), defaults.gpu),
    hstsMode: defaults.hstsMode,
    hstsValue: randomHex(8),
    webglMode: defaults.webglMode,
    webglValue: randomHex(16),
    canvasMode: defaults.canvasMode,
    canvasValue: randomDecimal(),
    pluginsMode: defaults.pluginsMode,
    pluginsValue: randomHex(16),
    rectsMode: defaults.rectsMode,
    rectsValue: randomHex(16),
    fontsMode: defaults.fontsMode,
    fontsValue: randomHex(16),
    batteryState: defaults.batteryState,
    bluetoothState: defaults.bluetoothState,
    networkState: defaults.networkState
  };
}

function getRandomValues(os: string): FingerprintValues {
  const defaults = getOsDefaults(os);
  const compatibility = getCompatibility(os);
  return {
    platform: defaults.platform,
    language: pick(languageOptions).value,
    timezone: pick(timezoneOptions).value,
    cpu: pick(cpuOptions).value,
    memory: pick(memoryOptions).value,
    screen: pick(getScreenOptions(compatibility)),
    gpu: pick(getGpuOptions(compatibility)),
    hstsMode: 'random',
    hstsValue: randomHex(8),
    webglMode: 'random',
    webglValue: randomHex(16),
    canvasMode: 'random',
    canvasValue: randomDecimal(),
    pluginsMode: 'random',
    pluginsValue: randomHex(16),
    rectsMode: 'random',
    rectsValue: randomHex(16),
    fontsMode: 'random',
    fontsValue: randomHex(16),
    batteryState: pick(batteryStateOptions).value,
    bluetoothState: pick(bluetoothStateOptions).value,
    networkState: pick(networkStateOptions).value
  };
}

function getOsDefaults(os: string): OsFingerprintDefault {
  return osDefaults.find((item) => item.os === os) ?? osDefaults[0];
}

function getCompatibility(os: string): OsCompatibility {
  return osCompatibility.find((item) => item.os === os) ?? osCompatibility[0];
}

function getPlatformOptions(compatibility: OsCompatibility): readonly Option[] {
  return platformOptions.filter((option) => compatibility.platforms.includes(option.value));
}

function getScreenOptions(compatibility: OsCompatibility): readonly ScreenOption[] {
  return screenOptions.filter((option) => compatibility.mobile ? option.width < 600 : option.width >= 1000);
}

function getGpuOptions(compatibility: OsCompatibility): readonly GpuOption[] {
  return gpuOptions.filter((option) => compatibility.gpuValues.includes(option.value));
}

function findScreenBySize(options: readonly ScreenOption[], initialProfile: ProfileDetail | undefined): ScreenOption | undefined {
  const width = initialProfile?.fingerprint?.screenWidth;
  const height = initialProfile?.fingerprint?.screenHeight;
  return options.find((option) => option.width === width && option.height === height);
}

function findGpuByMeta(options: readonly GpuOption[], initialProfile: ProfileDetail | undefined): GpuOption | undefined {
  const vendor = initialProfile?.fingerprint?.webglVendor;
  const renderer = initialProfile?.fingerprint?.webglRenderer;
  return options.find((option) => option.vendor === vendor && option.renderer === renderer);
}

function hasOption(options: readonly Option[], value: string | undefined): boolean {
  return value ? options.some((option) => option.value === value) : false;
}

function randomMode(value: string | undefined, fallback: string): string {
  return value === 'random' ? value : fallback;
}

function randomHex(length: number): string {
  return Array.from({ length }, () => Math.floor(Math.random() * 16).toString(16).toUpperCase()).join('');
}

function randomDecimal(): string {
  return String(Math.floor(1000000000 + Math.random() * 9000000000));
}

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)] ?? items[0];
}

function findScreen(options: readonly ScreenOption[], value: string): ScreenOption {
  return options.find((option) => option.value === value) ?? options[0];
}

function findGpu(options: readonly GpuOption[], value: string): GpuOption {
  return options.find((option) => option.value === value) ?? options[0];
}
