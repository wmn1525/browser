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

/** 屏幕色深保留常见组合，保存时拆成 colorDepth 和 pixelDepth。 */
export const screenDepthOptions: readonly Option[] = [
  { label: '24 / 24', value: '24x24' },
  { label: '30 / 30', value: '30x30' },
  { label: '32 / 32', value: '32x32' }
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
export const fingerprintHookModeOptions: readonly Option[] = [
  { label: '系统值', value: 'default' },
  { label: '自定义值', value: 'value' },
  { label: '按标签页随机', value: 'page' },
  { label: '按浏览器启动随机', value: 'browser' },
  { label: '按域名随机', value: 'domain' },
  { label: '按全局种子随机', value: 'global' }
];

/** 开关型检测面只允许保留系统值、启用或禁用。 */
export const switchHookModeOptions: readonly Option[] = [
  { label: '系统值', value: 'default' },
  { label: '启用', value: 'enabled' },
  { label: '禁用', value: 'disabled' }
];

/** 保留旧导出名，避免表单组件改动过大。 */
export const fingerprintModeOptions = fingerprintHookModeOptions;

export const clientHintsPlatformOptions: readonly Option[] = [
  { label: 'Windows', value: 'Windows' },
  { label: 'macOS', value: 'macOS' },
  { label: 'Linux', value: 'Linux' },
  { label: 'Android', value: 'Android' },
  { label: 'iOS', value: 'iOS' }
];

export const clientHintsArchitectureOptions: readonly Option[] = [
  { label: 'x86', value: 'x86' },
  { label: 'arm', value: 'arm' },
  { label: 'arm64', value: 'arm64' }
];

export const clientHintsMobileOptions: readonly Option[] = [
  { label: '桌面', value: 'false' },
  { label: '移动端', value: 'true' }
];
