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
  platformOptions,
  screenDepthOptions,
  screenOptions,
  switchHookModeOptions,
  timezoneOptions
} from './profile-fingerprint-options';
import type { Option, ScreenOption } from './profile-fingerprint-options';
import { gpuOptions, osCompatibility, osDefaults } from './profile-fingerprint-device-options';
import type { GpuOption, OsCompatibility, OsFingerprintDefault } from './profile-fingerprint-device-options';

/** 指纹表单内部状态，字段与隐藏表单项一一对应。 */
export interface FingerprintValues {
  readonly platform: string;
  readonly language: string;
  readonly languages: string;
  readonly timezone: string;
  readonly cpu: string;
  readonly memory: string;
  readonly screen: ScreenOption;
  readonly screenDepth: string;
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
  readonly clientHintsMode: string;
  readonly clientHintsPlatform: string;
  readonly clientHintsPlatformVersion: string;
  readonly clientHintsArchitecture: string;
  readonly clientHintsMobile: string;
  readonly clientHintsBrandVersion: string;
  readonly audioMode: string;
  readonly audioValue: string;
  readonly webgpuMode: string;
  readonly webgpuValue: string;
  readonly webrtcMode: string;
  readonly serviceWorkerMode: string;
  readonly batteryState: string;
  readonly bluetoothState: string;
  readonly networkState: string;
}

/** 屏幕色深拆分结果，提交表单时写成两个数值字段。 */
export interface ScreenDepthValue {
  readonly colorDepth: number;
  readonly pixelDepth: number;
}

/** 根据 profile 详情生成表单初始值，兼容旧 profile 中的 native/random 模式。 */
export function getInitialValues(initialProfile: ProfileDetail | undefined, os: string): FingerprintValues {
  const defaults = getDefaultValues(os);
  const compatibility = getCompatibility(os);
  const fingerprint = initialProfile?.fingerprint;
  const platform = fingerprint?.platform;
  const language = fingerprint?.language;
  const timezone = initialProfile?.timezone;
  const cpu = String(fingerprint?.hardwareConcurrency ?? defaults.cpu);
  const memory = String(fingerprint?.deviceMemory ?? defaults.memory);
  const screen = findScreenBySize(getScreenOptions(compatibility), initialProfile) ?? defaults.screen;
  const gpu = findGpuByMeta(getGpuOptions(compatibility), initialProfile) ?? defaults.gpu;

  return {
    platform: compatibility.platforms.includes(platform ?? '') ? platform ?? defaults.platform : defaults.platform,
    language: hasOption(languageOptions, language) ? language ?? defaults.language : defaults.language,
    languages: fingerprint?.languages ?? languageList(defaults.language),
    timezone: hasOption(timezoneOptions, timezone) ? timezone ?? defaults.timezone : defaults.timezone,
    cpu: hasOption(cpuOptions, cpu) ? cpu : defaults.cpu,
    memory: hasOption(memoryOptions, memory) ? memory : defaults.memory,
    screen,
    screenDepth: getInitialScreenDepth(initialProfile, defaults.screenDepth),
    gpu,
    hstsMode: normalizeMode(fingerprint?.hstsMode, defaults.hstsMode, fingerprintHookModeOptions),
    hstsValue: fingerprint?.hstsValue ?? randomHex(8),
    webglMode: normalizeMode(fingerprint?.webglMode, defaults.webglMode, fingerprintHookModeOptions),
    webglValue: fingerprint?.webglValue ?? randomHex(16),
    canvasMode: normalizeMode(fingerprint?.canvasMode, defaults.canvasMode, fingerprintHookModeOptions),
    canvasValue: fingerprint?.canvasValue ?? randomDecimal(),
    pluginsMode: normalizeMode(fingerprint?.pluginsMode, defaults.pluginsMode, fingerprintHookModeOptions),
    pluginsValue: fingerprint?.pluginsValue ?? randomHex(16),
    rectsMode: normalizeMode(fingerprint?.rectsMode, defaults.rectsMode, fingerprintHookModeOptions),
    rectsValue: fingerprint?.rectsValue ?? randomHex(16),
    fontsMode: normalizeMode(fingerprint?.fontsMode, defaults.fontsMode, fingerprintHookModeOptions),
    fontsValue: fingerprint?.fontsValue ?? randomHex(16),
    clientHintsMode: normalizeMode(fingerprint?.clientHintsMode, defaults.clientHintsMode, fingerprintHookModeOptions),
    clientHintsPlatform: optionValue(clientHintsPlatformOptions, fingerprint?.clientHintsPlatform, defaults.clientHintsPlatform),
    clientHintsPlatformVersion: fingerprint?.clientHintsPlatformVersion ?? platformVersion(os),
    clientHintsArchitecture: optionValue(clientHintsArchitectureOptions, fingerprint?.clientHintsArchitecture, defaults.clientHintsArchitecture),
    clientHintsMobile: optionValue(clientHintsMobileOptions, String(fingerprint?.clientHintsMobile ?? defaults.clientHintsMobile), defaults.clientHintsMobile),
    clientHintsBrandVersion: fingerprint?.clientHintsBrandVersion ?? '140',
    audioMode: normalizeMode(fingerprint?.audioMode, defaults.audioMode, fingerprintHookModeOptions),
    audioValue: fingerprint?.audioValue ?? randomHex(16),
    webgpuMode: normalizeMode(fingerprint?.webgpuMode, defaults.webgpuMode, fingerprintHookModeOptions),
    webgpuValue: fingerprint?.webgpuValue ?? randomHex(16),
    webrtcMode: normalizeMode(fingerprint?.webrtcMode, defaults.webrtcMode, switchHookModeOptions),
    serviceWorkerMode: normalizeMode(fingerprint?.serviceWorkerMode, defaults.serviceWorkerMode, switchHookModeOptions),
    batteryState: optionValue(batteryStateOptions, fingerprint?.batteryState, defaults.batteryState),
    bluetoothState: optionValue(bluetoothStateOptions, fingerprint?.bluetoothState, defaults.bluetoothState),
    networkState: optionValue(networkStateOptions, fingerprint?.networkState, defaults.networkState)
  };
}

/** 根据操作系统生成默认指纹值，切换 OS 时使用。 */
export function getDefaultValues(os: string): FingerprintValues {
  const defaults = getOsDefaults(os);
  const compatibility = getCompatibility(os);
  return {
    platform: defaults.platform,
    language: defaults.language,
    languages: languageList(defaults.language),
    timezone: defaults.timezone,
    cpu: defaults.cpu,
    memory: defaults.memory,
    screen: findScreen(getScreenOptions(compatibility), defaults.screen),
    screenDepth: defaults.screenDepth,
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
    clientHintsMode: defaults.clientHintsMode,
    clientHintsPlatform: defaults.clientHintsPlatform,
    clientHintsPlatformVersion: platformVersion(os),
    clientHintsArchitecture: defaults.clientHintsArchitecture,
    clientHintsMobile: defaults.clientHintsMobile,
    clientHintsBrandVersion: '140',
    audioMode: defaults.audioMode,
    audioValue: randomHex(16),
    webgpuMode: defaults.webgpuMode,
    webgpuValue: randomHex(16),
    webrtcMode: defaults.webrtcMode,
    serviceWorkerMode: defaults.serviceWorkerMode,
    batteryState: defaults.batteryState,
    bluetoothState: defaults.bluetoothState,
    networkState: defaults.networkState
  };
}

/** 为“随机指纹”按钮生成一次完整但受 OS 约束的配置。 */
export function getRandomValues(os: string): FingerprintValues {
  const defaults = getOsDefaults(os);
  const compatibility = getCompatibility(os);
  const language = pick(languageOptions).value;
  return {
    ...getDefaultValues(os),
    language,
    languages: languageList(language),
    timezone: pick(timezoneOptions).value,
    cpu: pick(cpuOptions).value,
    memory: pick(memoryOptions).value,
    screen: pick(getScreenOptions(compatibility)),
    screenDepth: pick(screenDepthOptions).value,
    gpu: pick(getGpuOptions(compatibility)),
    clientHintsPlatform: defaults.clientHintsPlatform,
    clientHintsArchitecture: defaults.clientHintsArchitecture,
    clientHintsMobile: defaults.clientHintsMobile,
    clientHintsBrandVersion: String(pick(['136', '140', '148', '149'])),
    hstsValue: randomHex(8),
    webglValue: randomHex(16),
    canvasValue: randomDecimal(),
    pluginsValue: randomHex(16),
    rectsValue: randomHex(16),
    fontsValue: randomHex(16),
    audioValue: randomHex(16),
    webgpuValue: randomHex(16),
    batteryState: pick(batteryStateOptions).value,
    bluetoothState: pick(bluetoothStateOptions).value,
    networkState: pick(networkStateOptions).value
  };
}

/** 获取当前 OS 对应的平台、屏幕和 GPU 兼容约束。 */
export function getCompatibility(os: string): OsCompatibility {
  return osCompatibility.find((item) => item.os === os) ?? osCompatibility[0];
}

/** 根据 OS 兼容约束过滤 navigator.platform 选项。 */
export function getPlatformOptions(compatibility: OsCompatibility): readonly Option[] {
  return platformOptions.filter((option) => compatibility.platforms.includes(option.value));
}

/** 根据 OS 兼容约束过滤屏幕尺寸，移动端只展示移动分辨率。 */
export function getScreenOptions(compatibility: OsCompatibility): readonly ScreenOption[] {
  return screenOptions.filter((option) => compatibility.mobile ? option.width < 600 : option.width >= 1000);
}

/** 根据 OS 兼容约束过滤 GPU 预设。 */
export function getGpuOptions(compatibility: OsCompatibility): readonly GpuOption[] {
  return gpuOptions.filter((option) => compatibility.gpuValues.includes(option.value));
}

/** 把 24x24 这类选项值拆成 colorDepth 和 pixelDepth。 */
export function getScreenDepth(value: string): ScreenDepthValue {
  const [colorDepth, pixelDepth] = value.split('x').map((item) => Number.parseInt(item, 10));
  return {
    colorDepth: Number.isFinite(colorDepth) ? colorDepth : 24,
    pixelDepth: Number.isFinite(pixelDepth) ? pixelDepth : 24
  };
}

function getOsDefaults(os: string): OsFingerprintDefault {
  return osDefaults.find((item) => item.os === os) ?? osDefaults[0];
}

function getInitialScreenDepth(initialProfile: ProfileDetail | undefined, fallback: string): string {
  const colorDepth = initialProfile?.fingerprint?.screenColorDepth;
  const pixelDepth = initialProfile?.fingerprint?.screenPixelDepth;
  const value = colorDepth && pixelDepth ? `${colorDepth}x${pixelDepth}` : fallback;
  return hasOption(screenDepthOptions, value) ? value : fallback;
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

function normalizeMode(value: string | undefined, fallback: string, options: readonly Option[]): string {
  if (value === 'native') {
    return 'default';
  }
  if (value === 'random') {
    return fallback;
  }
  return hasOption(options, value) ? value ?? fallback : fallback;
}

function optionValue(options: readonly Option[], value: string | undefined, fallback: string): string {
  return hasOption(options, value) ? value ?? fallback : fallback;
}

function hasOption(options: readonly Option[], value: string | undefined): boolean {
  return value ? options.some((option) => option.value === value) : false;
}

function languageList(language: string): string {
  const base = language.split('-')[0];
  return base && base !== language ? `${language},${base}` : language;
}

function platformVersion(os: string): string {
  if (os === 'Mac') return '14.0.0';
  if (os === 'Linux') return '6.5.0';
  if (os === 'Android') return '10.0.0';
  if (os === 'iOS') return '18.0.0';
  return '10.0.0';
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

/** 根据选项值找到屏幕分辨率，缺失时回到当前 OS 的第一个可用值。 */
export function findScreen(options: readonly ScreenOption[], value: string): ScreenOption {
  return options.find((option) => option.value === value) ?? options[0];
}

/** 根据选项值找到 GPU 预设，缺失时回到当前 OS 的第一个可用值。 */
export function findGpu(options: readonly GpuOption[], value: string): GpuOption {
  return options.find((option) => option.value === value) ?? options[0];
}
