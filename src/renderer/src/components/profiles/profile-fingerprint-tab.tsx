import { Button, Input, Select } from 'antd';
import { Monitor, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

import type { ProfileDetail } from '../../../../shared/types';
import {
  batteryStateOptions,
  bluetoothStateOptions,
  clientHintsArchitectureOptions,
  clientHintsMobileOptions,
  clientHintsPlatformOptions,
  cpuOptions,
  fingerprintHookModeOptions,
  languageOptions,
  memoryOptions,
  networkStateOptions,
  screenDepthOptions,
  switchHookModeOptions,
  timezoneOptions
} from './profile-fingerprint-options';
import type { Option, ScreenOption } from './profile-fingerprint-options';
import type { GpuOption } from './profile-fingerprint-device-options';
import {
  findGpu,
  findScreen,
  getCompatibility,
  getDefaultValues,
  getGpuOptions,
  getInitialValues,
  getPlatformOptions,
  getRandomValues,
  getScreenDepth,
  getScreenOptions
} from './profile-fingerprint-values';
import { FormCard, Notice } from './profile-form-fields';

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
        <Button htmlType="button" onClick={() => setValues(getRandomValues(os))} size="small" type="primary"><RefreshCw className="size-4" />随机指纹</Button>
      </div>
      <Section title="语言与时区">
        <SelectField label="系统平台" name="platform" onChange={(platform) => setValues({ ...values, platform })} options={platformChoices} value={values.platform} />
        <SelectField label="接受语言" name="language" onChange={(language) => setValues({ ...values, language })} options={languageOptions} value={values.language} />
        <TextField label="语言列表" name="languages" onChange={(languages) => setValues({ ...values, languages })} value={values.languages} />
        <SelectField label="时区" name="timezone" onChange={(timezone) => setValues({ ...values, timezone })} options={timezoneOptions} value={values.timezone} />
      </Section>
      <Section title="设备与显示">
        <SelectField label="CPU 核心数" name="cpu" onChange={(cpu) => setValues({ ...values, cpu })} options={cpuOptions} value={values.cpu} />
        <SelectField label="内存大小" name="memory" onChange={(memory) => setValues({ ...values, memory })} options={memoryOptions} value={values.memory} />
        <ResolutionSelect onChange={(screen) => setValues({ ...values, screen })} options={screenChoices} screen={values.screen} />
        <ScreenDepthSelect onChange={(screenDepth) => setValues({ ...values, screenDepth })} value={values.screenDepth} />
      </Section>
      <Section title="Client Hints">
        <FingerprintModeRow label="Client Hints 指纹" mode={values.clientHintsMode} modeName="clientHintsMode" onChange={(clientHintsMode) => setValues({ ...values, clientHintsMode })} value={values.clientHintsBrandVersion} valueName="clientHintsBrandVersion" />
        <SelectField label="CH 平台" name="clientHintsPlatform" onChange={(clientHintsPlatform) => setValues({ ...values, clientHintsPlatform })} options={clientHintsPlatformOptions} value={values.clientHintsPlatform} />
        <TextField label="CH 平台版本" name="clientHintsPlatformVersion" onChange={(clientHintsPlatformVersion) => setValues({ ...values, clientHintsPlatformVersion })} value={values.clientHintsPlatformVersion} />
        <SelectField label="CH 架构" name="clientHintsArchitecture" onChange={(clientHintsArchitecture) => setValues({ ...values, clientHintsArchitecture })} options={clientHintsArchitectureOptions} value={values.clientHintsArchitecture} />
        <SelectField label="CH 设备类型" name="clientHintsMobile" onChange={(clientHintsMobile) => setValues({ ...values, clientHintsMobile })} options={clientHintsMobileOptions} value={values.clientHintsMobile} />
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
        <FingerprintModeRow label="音频上下文指纹" mode={values.audioMode} modeName="audioMode" onChange={(audioMode) => setValues({ ...values, audioMode })} value={values.audioValue} valueName="audioValue" />
        <FingerprintModeRow label="浏览器插件指纹" mode={values.pluginsMode} modeName="pluginsMode" onChange={(pluginsMode) => setValues({ ...values, pluginsMode })} value={values.pluginsValue} valueName="pluginsValue" />
        <FingerprintModeRow label="视窗及浏览器特征指纹" mode={values.rectsMode} modeName="rectsMode" onChange={(rectsMode) => setValues({ ...values, rectsMode })} value={values.rectsValue} valueName="rectsValue" />
        <FingerprintModeRow label="字体及输入设备指纹" mode={values.fontsMode} modeName="fontsMode" onChange={(fontsMode) => setValues({ ...values, fontsMode })} value={values.fontsValue} valueName="fontsValue" />
        <FingerprintModeRow label="WebGPU 指纹" mode={values.webgpuMode} modeName="webgpuMode" onChange={(webgpuMode) => setValues({ ...values, webgpuMode })} value={values.webgpuValue} valueName="webgpuValue" />
        <ModeOnlyRow label="WebRTC 保护" mode={values.webrtcMode} modeName="webrtcMode" onChange={(webrtcMode) => setValues({ ...values, webrtcMode })} options={switchHookModeOptions} />
        <ModeOnlyRow label="Service Worker" mode={values.serviceWorkerMode} modeName="serviceWorkerMode" onChange={(serviceWorkerMode) => setValues({ ...values, serviceWorkerMode })} options={switchHookModeOptions} />
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
        <input name={modeName} type="hidden" value={mode} />
        <Select onChange={onChange} options={[...fingerprintHookModeOptions]} value={mode} />
        <Input name={valueName} readOnly value={mode === 'default' || mode === 'disabled' ? mode : value} />
      </div>
    </div>
  );
}

function ModeOnlyRow({ label, mode, modeName, onChange, options }: {
  readonly label: string;
  readonly mode: string;
  readonly modeName: string;
  readonly onChange: (value: string) => void;
  readonly options: readonly Option[];
}): JSX.Element {
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <div>
        <input name={modeName} type="hidden" value={mode} />
        <Select className="w-full" onChange={onChange} options={[...options]} value={mode} />
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
    <label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <input name={name} type="hidden" value={value} />
      <Select onChange={onChange} options={[...options]} value={value} />
    </label>
  );
}

function TextField({ label, name, onChange, value }: {
  readonly label: string;
  readonly name: string;
  readonly onChange: (value: string) => void;
  readonly value: string;
}): JSX.Element {
  return (
    <label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <Input name={name} onChange={(event) => onChange(event.target.value)} value={value} />
    </label>
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
      <Select onChange={(value) => onChange(findScreen(options, value))} options={options.map((option) => ({ label: option.label, value: option.value }))} value={screen.value} />
    </div>
  );
}

function ScreenDepthSelect({ onChange, value }: {
  readonly onChange: (value: string) => void;
  readonly value: string;
}): JSX.Element {
  const depth = getScreenDepth(value);
  return (
    <div className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">屏幕色深</span>
      <input name="screenColorDepth" type="hidden" value={depth.colorDepth} />
      <input name="screenPixelDepth" type="hidden" value={depth.pixelDepth} />
      <Select onChange={onChange} options={[...screenDepthOptions]} value={value} />
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
      <Select onChange={(value) => onChange(findGpu(options, value))} options={options.map((option) => ({ label: option.label, value: option.value }))} value={gpu.value} />
    </div>
  );
}

function ReadonlyField({ label, value }: { readonly label: string; readonly value: string }): JSX.Element {
  return (
    <label className="grid grid-cols-[128px_1fr] items-center gap-3">
      <span className="text-sm text-secondary">{label}</span>
      <Input readOnly value={value} />
    </label>
  );
}
