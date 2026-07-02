/** GPU 预设保存展示文案和运行时 WebGL 元信息。 */
export interface GpuOption {
  readonly label: string;
  readonly value: string;
  readonly vendor: string;
  readonly renderer: string;
}

/** 每个 OS 的默认指纹值，切换 OS 时用于整体重置。 */
export interface OsFingerprintDefault {
  readonly os: string;
  readonly platform: string;
  readonly language: string;
  readonly timezone: string;
  readonly cpu: string;
  readonly memory: string;
  readonly screen: string;
  readonly screenDepth: string;
  readonly gpu: string;
  readonly hstsMode: string;
  readonly webglMode: string;
  readonly canvasMode: string;
  readonly pluginsMode: string;
  readonly rectsMode: string;
  readonly fontsMode: string;
  readonly clientHintsMode: string;
  readonly clientHintsPlatform: string;
  readonly clientHintsArchitecture: string;
  readonly clientHintsMobile: string;
  readonly audioMode: string;
  readonly webgpuMode: string;
  readonly webrtcMode: string;
  readonly serviceWorkerMode: string;
  readonly batteryState: string;
  readonly bluetoothState: string;
  readonly networkState: string;
}

/** OS 兼容白名单用于过滤明显冲突的平台、GPU 和移动分辨率。 */
export interface OsCompatibility {
  readonly os: string;
  readonly platforms: readonly string[];
  readonly gpuValues: readonly string[];
  readonly mobile: boolean;
}

/** GPU 预设参考常见桌面和移动设备型号，并按 OS 限制可选范围。 */
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

/** 每个操作系统都有独立默认值，避免跨平台冲突。 */
export const osDefaults: readonly OsFingerprintDefault[] = [
  osDefault('Windows', 'Win32', 'zh-CN', 'Asia/Shanghai', '8', '16', '1920x1080', 'win-nvidia-rtx3060', 'system', 'disabled', 'wifi', 'Windows', 'x86', 'false'),
  osDefault('Mac', 'MacIntel', 'en-US', 'America/Los_Angeles', '8', '16', '1440x900', 'mac-apple-m', 'charging', 'enabled', 'wifi', 'macOS', 'arm', 'false'),
  osDefault('Linux', 'Linux x86_64', 'en-US', 'Europe/London', '8', '16', '1920x1080', 'linux-nvidia-rtx3060', 'system', 'disabled', 'ethernet', 'Linux', 'x86', 'false'),
  osDefault('Android', 'Linux armv8l', 'zh-CN', 'Asia/Shanghai', '8', '8', '412x915', 'android-adreno', 'discharging', 'enabled', '5g', 'Android', 'arm', 'true'),
  osDefault('iOS', 'iPhone', 'en-US', 'America/Los_Angeles', '6', '4', '390x844', 'ios-apple-gpu', 'discharging', 'enabled', '5g', 'iOS', 'arm64', 'true')
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
  gpuValue: string,
  batteryState: string,
  bluetoothState: string,
  networkState: string,
  clientHintsPlatform: string,
  clientHintsArchitecture: string,
  clientHintsMobile: string
): OsFingerprintDefault {
  return {
    os,
    platform,
    language,
    timezone,
    cpu,
    memory,
    screen,
    screenDepth: '24x24',
    gpu: gpuValue,
    hstsMode: 'page',
    webglMode: 'page',
    canvasMode: 'page',
    pluginsMode: 'page',
    rectsMode: 'page',
    fontsMode: 'page',
    clientHintsMode: 'value',
    clientHintsPlatform,
    clientHintsArchitecture,
    clientHintsMobile,
    audioMode: 'browser',
    webgpuMode: 'default',
    webrtcMode: 'disabled',
    serviceWorkerMode: 'disabled',
    batteryState,
    bluetoothState,
    networkState
  };
}
