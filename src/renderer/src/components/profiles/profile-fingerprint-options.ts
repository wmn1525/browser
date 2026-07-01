/** 指纹下拉项保存稳定值，展示文案只服务于表单可读性。 */
export interface Option {
  readonly label: string;
  readonly value: string;
}

export interface ScreenOption {
  readonly label: string;
  readonly value: string;
  readonly width: number;
  readonly height: number;
}

export interface GpuOption {
  readonly label: string;
  readonly value: string;
  readonly vendor: string;
  readonly renderer: string;
}

export interface OsFingerprintDefault {
  readonly os: string;
  readonly platform: string;
  readonly language: string;
  readonly timezone: string;
  readonly cpu: string;
  readonly memory: string;
  readonly screen: string;
  readonly gpu: string;
  readonly hstsMode: string;
  readonly webglMode: string;
  readonly canvasMode: string;
  readonly pluginsMode: string;
  readonly rectsMode: string;
  readonly fontsMode: string;
  readonly batteryState: string;
  readonly bluetoothState: string;
  readonly networkState: string;
}

export interface OsCompatibility {
  readonly os: string;
  readonly platforms: readonly string[];
  readonly gpuValues: readonly string[];
  readonly mobile: boolean;
}

/** 常见平台值需和浏览器 navigator.platform 习惯保持一致。 */
export const platformOptions: readonly Option[] = [
  { label: 'Windows / Win32', value: 'Win32' },
  { label: 'macOS / MacIntel', value: 'MacIntel' },
  { label: 'Linux 桌面 / Linux x86_64', value: 'Linux x86_64' },
  { label: 'Android / Linux armv8l', value: 'Linux armv8l' },
  { label: 'iOS / iPhone', value: 'iPhone' }
];

/** 语言与时区优先给出常见地区组合，减少手写格式错误。 */
export const languageOptions: readonly Option[] = [
  { label: '简体中文 / zh-CN', value: 'zh-CN' },
  { label: '英文（美国）/ en-US', value: 'en-US' },
  { label: '英文（英国）/ en-GB', value: 'en-GB' },
  { label: '日文 / ja-JP', value: 'ja-JP' },
  { label: '韩文 / ko-KR', value: 'ko-KR' },
  { label: '德文 / de-DE', value: 'de-DE' },
  { label: '法文 / fr-FR', value: 'fr-FR' },
  { label: '西班牙文 / es-ES', value: 'es-ES' }
];

export const timezoneOptions: readonly Option[] = [
  { label: '中国 / Asia/Shanghai', value: 'Asia/Shanghai' },
  { label: '美国东部 / America/New_York', value: 'America/New_York' },
  { label: '美国西部 / America/Los_Angeles', value: 'America/Los_Angeles' },
  { label: '英国 / Europe/London', value: 'Europe/London' },
  { label: '德国 / Europe/Berlin', value: 'Europe/Berlin' },
  { label: '日本 / Asia/Tokyo', value: 'Asia/Tokyo' },
  { label: '韩国 / Asia/Seoul', value: 'Asia/Seoul' },
  { label: '澳大利亚东部 / Australia/Sydney', value: 'Australia/Sydney' }
];

export const cpuOptions: readonly Option[] = ['2', '4', '6', '8', '12', '16'].map((value) => ({
  label: `${value} 核`,
  value
}));

export const memoryOptions: readonly Option[] = ['4', '8', '16', '32'].map((value) => ({
  label: `${value} GB`,
  value
}));

/** 分辨率选项选取桌面和移动端常见值，保存时拆成宽高两个字段。 */
export const screenOptions: readonly ScreenOption[] = [
  { label: '桌面 1920 x 1080', value: '1920x1080', width: 1920, height: 1080 },
  { label: '桌面 1366 x 768', value: '1366x768', width: 1366, height: 768 },
  { label: '桌面 1440 x 900', value: '1440x900', width: 1440, height: 900 },
  { label: '桌面 1536 x 864', value: '1536x864', width: 1536, height: 864 },
  { label: '桌面 2560 x 1440', value: '2560x1440', width: 2560, height: 1440 },
  { label: '移动 390 x 844', value: '390x844', width: 390, height: 844 },
  { label: '移动 412 x 915', value: '412x915', width: 412, height: 915 }
];

/** GPU 预设参考 Steam 2026 年硬件调查中的常见型号，并按 OS 限制可选范围。 */
export const gpuOptions: readonly GpuOption[] = [
  gpu('Windows / NVIDIA RTX 3060', 'win-nvidia-rtx3060', 'NVIDIA', 'NVIDIA GeForce RTX 3060 Direct3D11'),
  gpu('Windows / NVIDIA RTX 4060', 'win-nvidia-rtx4060', 'NVIDIA', 'NVIDIA GeForce RTX 4060 Direct3D11'),
  gpu('Windows / NVIDIA RTX 4060 Laptop', 'win-nvidia-rtx4060-laptop', 'NVIDIA', 'NVIDIA GeForce RTX 4060 Laptop GPU Direct3D11'),
  gpu('Windows / NVIDIA RTX 3050', 'win-nvidia-rtx3050', 'NVIDIA', 'NVIDIA GeForce RTX 3050 Direct3D11'),
  gpu('Windows / NVIDIA GTX 1650', 'win-nvidia-gtx1650', 'NVIDIA', 'NVIDIA GeForce GTX 1650 Direct3D11'),
  gpu('Windows / NVIDIA RTX 3070', 'win-nvidia-rtx3070', 'NVIDIA', 'NVIDIA GeForce RTX 3070 Direct3D11'),
  gpu('Windows / NVIDIA RTX 4070', 'win-nvidia-rtx4070', 'NVIDIA', 'NVIDIA GeForce RTX 4070 Direct3D11'),
  gpu('Windows / Intel Iris Xe', 'win-intel-iris-xe', 'Intel', 'Intel Iris Xe Graphics Direct3D11'),
  gpu('Windows / Intel UHD Graphics', 'win-intel-uhd', 'Intel', 'Intel(R) UHD Graphics 620 Direct3D11'),
  gpu('Windows / AMD Radeon RX 6600', 'win-amd-rx6600', 'AMD', 'AMD Radeon RX 6600 Direct3D11'),
  gpu('Windows / AMD Radeon RX 7800 XT', 'win-amd-rx7800xt', 'AMD', 'AMD Radeon RX 7800 XT Direct3D11'),
  gpu('Windows / AMD Radeon RX 9070 XT', 'win-amd-rx9070xt', 'AMD', 'AMD Radeon RX 9070 XT Direct3D11'),
  gpu('macOS / Apple M 系列', 'mac-apple-m', 'Apple', 'ANGLE Metal Renderer: Apple M2'),
  gpu('Linux / NVIDIA RTX 3060', 'linux-nvidia-rtx3060', 'NVIDIA', 'NVIDIA GeForce RTX 3060/PCIe/SSE2'),
  gpu('Linux / Intel Mesa', 'linux-intel-mesa', 'Intel', 'Mesa Intel(R) UHD Graphics 620'),
  gpu('Linux / AMD Radeon RX 6600', 'linux-amd-rx6600', 'AMD', 'AMD Radeon RX 6600 (RADV NAVI23)'),
  gpu('Android / Qualcomm Adreno', 'android-adreno', 'Qualcomm', 'Adreno (TM) 640'),
  gpu('Android / ARM Mali', 'android-mali', 'ARM', 'Mali-G78'),
  gpu('iOS / Apple GPU', 'ios-apple-gpu', 'Apple', 'Apple A15 GPU')
];

export const batteryStateOptions: readonly Option[] = [
  { label: '跟随系统', value: 'system' },
  { label: '充电中', value: 'charging' },
  { label: '未充电', value: 'discharging' },
  { label: '不暴露电池', value: 'disabled' }
];

export const bluetoothStateOptions: readonly Option[] = [
  { label: '跟随系统', value: 'system' },
  { label: '开启', value: 'enabled' },
  { label: '关闭', value: 'disabled' }
];

export const networkStateOptions: readonly Option[] = [
  { label: 'WiFi', value: 'wifi' },
  { label: '有线网络', value: 'ethernet' },
  { label: '4G', value: '4g' },
  { label: '5G', value: '5g' },
  { label: '离线', value: 'offline' }
];

/** 高级指纹策略用于控制是否和本机一致，或为检测面生成随机扰动。 */
export const fingerprintModeOptions: readonly Option[] = [
  { label: '与本机保持一致', value: 'native' },
  { label: '随机', value: 'random' }
];

/** 每个操作系统都有独立默认值，切换 OS 时按这里重置，避免跨平台冲突。 */
export const osDefaults: readonly OsFingerprintDefault[] = [
  osDefault('Windows', 'Win32', 'zh-CN', 'Asia/Shanghai', '8', '16', '1920x1080', 'win-nvidia-rtx3060', 'system', 'disabled', 'wifi'),
  osDefault('Mac', 'MacIntel', 'en-US', 'America/Los_Angeles', '8', '16', '1440x900', 'mac-apple-m', 'charging', 'enabled', 'wifi'),
  osDefault('Linux', 'Linux x86_64', 'en-US', 'Europe/London', '8', '16', '1920x1080', 'linux-nvidia-rtx3060', 'system', 'disabled', 'ethernet'),
  osDefault('Android', 'Linux armv8l', 'zh-CN', 'Asia/Shanghai', '8', '8', '412x915', 'android-adreno', 'discharging', 'enabled', '5g'),
  osDefault('iOS', 'iPhone', 'en-US', 'America/Los_Angeles', '6', '4', '390x844', 'ios-apple-gpu', 'discharging', 'enabled', '5g')
];

/** OS 到选项白名单的映射用于过滤冲突项。 */
export const osCompatibility: readonly OsCompatibility[] = [
  { os: 'Windows', platforms: ['Win32'], gpuValues: ['win-nvidia-rtx3060', 'win-nvidia-rtx4060', 'win-nvidia-rtx4060-laptop', 'win-nvidia-rtx3050', 'win-nvidia-gtx1650', 'win-nvidia-rtx3070', 'win-nvidia-rtx4070', 'win-intel-iris-xe', 'win-intel-uhd', 'win-amd-rx6600', 'win-amd-rx7800xt', 'win-amd-rx9070xt'], mobile: false },
  { os: 'Mac', platforms: ['MacIntel'], gpuValues: ['mac-apple-m'], mobile: false },
  { os: 'Linux', platforms: ['Linux x86_64'], gpuValues: ['linux-nvidia-rtx3060', 'linux-intel-mesa', 'linux-amd-rx6600'], mobile: false },
  { os: 'Android', platforms: ['Linux armv8l'], gpuValues: ['android-adreno', 'android-mali'], mobile: true },
  { os: 'iOS', platforms: ['iPhone'], gpuValues: ['ios-apple-gpu'], mobile: true }
];

function gpu(label: string, value: string, vendorName: string, rendererDevice: string): GpuOption {
  return {
    label,
    value,
    vendor: 'Google Inc.',
    renderer: `ANGLE (${vendorName}, ${rendererDevice})`
  };
}

function osDefault(
  os: string,
  platform: string,
  language: string,
  timezone: string,
  cpu: string,
  memory: string,
  screen: string,
  gpu: string,
  batteryState: string,
  bluetoothState: string,
  networkState: string
): OsFingerprintDefault {
  return {
    os,
    platform,
    language,
    timezone,
    cpu,
    memory,
    screen,
    gpu,
    hstsMode: 'random',
    webglMode: 'random',
    canvasMode: 'random',
    pluginsMode: 'random',
    rectsMode: 'random',
    fontsMode: 'random',
    batteryState,
    bluetoothState,
    networkState
  };
}
