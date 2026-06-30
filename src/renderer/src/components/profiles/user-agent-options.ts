export interface OsOption {
  readonly label: string;
  readonly platform: string;
}

export interface UserAgentPreset {
  readonly id: string;
  readonly browser: string;
  readonly label: string;
  readonly os: string;
  readonly osVersion: string;
  readonly browserVersion: string;
  readonly userAgent: string;
}

interface BrowserVersion {
  readonly browser: string;
  readonly version: number;
}

interface SafariVersion {
  readonly browser: string;
  readonly version: string;
  readonly osVersion: string;
  readonly osToken: string;
}

export const osOptions: readonly OsOption[] = [
  { label: 'Windows', platform: 'Win32' },
  { label: 'Mac', platform: 'MacIntel' },
  { label: 'Linux', platform: 'Linux x86_64' },
  { label: 'Android', platform: 'Linux armv8l' },
  { label: 'iOS', platform: 'iPhone' }
];

const osVersionOptions: ReadonlyMap<string, readonly string[]> = new Map([
  ['Windows', ['Windows 10 / 11', 'Windows 11', 'Windows 10', 'Windows 8.1', 'Windows 7']],
  ['Mac', ['macOS 15', 'macOS 14', 'macOS 13', 'macOS 12', 'macOS 10.15.7+']],
  ['Linux', ['Linux x86_64', 'Ubuntu 24.04', 'Ubuntu 22.04', 'Debian 12', 'Fedora 40']],
  ['Android', ['Android 10+', 'Android 15', 'Android 14', 'Android 13', 'Android 12']],
  ['iOS', ['iOS 18', 'iOS 18.7.8', 'iOS 17.6', 'iOS 16.6']]
]);

const chromiumVersions: readonly BrowserVersion[] = [
  { browser: 'Chrome', version: 140 },
  { browser: 'Chrome', version: 148 },
  { browser: 'Chrome', version: 149 },
  { browser: 'Chrome', version: 136 },
  { browser: 'Chrome', version: 132 },
  { browser: 'Chrome', version: 128 },
  { browser: 'Chrome', version: 124 },
  { browser: 'Chrome', version: 120 },
  { browser: 'Edge', version: 140 },
  { browser: 'Edge', version: 148 },
  { browser: 'Edge', version: 149 },
  { browser: 'Edge', version: 136 },
  { browser: 'Edge', version: 132 },
  { browser: 'Edge', version: 128 },
  { browser: 'Edge', version: 124 }
];

const firefoxVersions: readonly number[] = [140, 145, 152, 135, 128, 120, 115];
const androidFirefoxVersions: readonly number[] = [140, 145, 152, 135, 128, 120];

const safariVersions: readonly SafariVersion[] = [
  { browser: 'Safari', version: '18.6', osVersion: 'macOS 15', osToken: '15_6' },
  { browser: 'Safari', version: '26.0', osVersion: 'macOS 15', osToken: '15_7_7' },
  { browser: 'Safari', version: '17.6', osVersion: 'macOS 14', osToken: '14_6' },
  { browser: 'Safari', version: '16.6', osVersion: 'macOS 13', osToken: '13_6' }
];

const iosSafariVersions: readonly SafariVersion[] = [
  { browser: 'Safari', version: '18.6', osVersion: 'iOS 18.6', osToken: '18_6' },
  { browser: 'Safari', version: '26.0', osVersion: 'iOS 18.7.8', osToken: '18_7_8' },
  { browser: 'Safari', version: '17.6', osVersion: 'iOS 17.6', osToken: '17_6' },
  { browser: 'Safari', version: '16.6', osVersion: 'iOS 16.6', osToken: '16_6' }
];

/**
 * UA 池不只放最新版本，也保留历史常用主版本。
 * Chromium 系列采用 UA Reduction 后的固定平台片段，适合指纹环境稳定复现。
 */
export const userAgentPresets: readonly UserAgentPreset[] = [
  ...desktopChromium('Windows', 'Windows 10 / 11', 'Windows NT 10.0; Win64; x64'),
  ...desktopFirefox('Windows', 'Windows 10 / 11', 'Windows NT 10.0; Win64; x64'),
  ...desktopOpera('Windows', 'Windows 10 / 11', 'Windows NT 10.0; Win64; x64'),
  ...safariDesktop(),
  ...desktopChromium('Mac', 'macOS 10.15.7+', 'Macintosh; Intel Mac OS X 10_15_7'),
  ...desktopFirefox('Mac', 'macOS 10.15+', 'Macintosh; Intel Mac OS X 10.15'),
  ...desktopChromium('Linux', 'Linux x86_64', 'X11; Linux x86_64'),
  ...desktopFirefox('Linux', 'Linux x86_64', 'X11; Linux x86_64'),
  ...androidChromium(),
  ...androidFirefox(),
  ...samsungInternet(),
  ...iosSafari(),
  ...iosChromium(),
  ...iosFirefox()
];

export function getPresetsForOs(os: string): readonly UserAgentPreset[] {
  return userAgentPresets.filter((preset) => preset.os === os);
}

export function getDefaultPreset(os: string): UserAgentPreset {
  return getPresetsForOs(os)[0] ?? userAgentPresets[0];
}

export function getOsVersionOptions(os: string): readonly string[] {
  return osVersionOptions.get(os) ?? [getDefaultPreset(os).osVersion];
}

export function getDefaultOsVersion(os: string): string {
  return getOsVersionOptions(os)[0];
}

export function getPresetByUserAgent(os: string, userAgent: string | undefined): UserAgentPreset | undefined {
  return userAgent ? getPresetsForOs(os).find((preset) => preset.userAgent === userAgent) : undefined;
}

export function getRandomPresetForOs(os: string, currentPresetId: string): UserAgentPreset {
  const presets = getPresetsForOs(os);
  const candidates = presets.filter((preset) => preset.id !== currentPresetId);
  return candidates[Math.floor(Math.random() * candidates.length)] ?? presets[0] ?? userAgentPresets[0];
}

function desktopChromium(os: string, osVersion: string, platform: string): readonly UserAgentPreset[] {
  return chromiumVersions.map((item) => {
    const edgeSuffix = item.browser === 'Edge' ? ` Edg/${item.version}.0.0.0` : '';
    return {
      id: `${slug(os)}-${slug(item.browser)}-${item.version}`,
      browser: item.browser,
      label: `${item.browser} ${item.version} / ${osVersion}`,
      os,
      osVersion,
      browserVersion: `${item.browser} ${item.version}`,
      userAgent: `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${item.version}.0.0.0 Safari/537.36${edgeSuffix}`
    };
  });
}

function desktopFirefox(os: string, osVersion: string, platform: string): readonly UserAgentPreset[] {
  return firefoxVersions.map((version) => ({
    id: `${slug(os)}-firefox-${version}`,
    browser: 'Firefox',
    label: `Firefox ${version} / ${osVersion}`,
    os,
    osVersion,
    browserVersion: `Firefox ${version}`,
    userAgent: `Mozilla/5.0 (${platform}; rv:${version}.0) Gecko/20100101 Firefox/${version}.0`
  }));
}

function desktopOpera(os: string, osVersion: string, platform: string): readonly UserAgentPreset[] {
  const versions: readonly BrowserVersion[] = [
    { browser: 'Opera', version: 126 },
    { browser: 'Opera', version: 118 },
    { browser: 'Opera', version: 112 }
  ];
  return versions.map((item) => ({
    id: `${slug(os)}-opera-${item.version}`,
    browser: item.browser,
    label: `Opera ${item.version} / ${osVersion}`,
    os,
    osVersion,
    browserVersion: `Opera ${item.version}`,
    userAgent: `Mozilla/5.0 (${platform}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${item.version + 13}.0.0.0 Safari/537.36 OPR/${item.version}.0.0.0`
  }));
}

function safariDesktop(): readonly UserAgentPreset[] {
  return safariVersions.map((item) => ({
    id: `mac-safari-${slug(item.version)}`,
    browser: item.browser,
    label: `Safari ${item.version} / ${item.osVersion}`,
    os: 'Mac',
    osVersion: item.osVersion,
    browserVersion: `Safari ${item.version}`,
    userAgent: `Mozilla/5.0 (Macintosh; Intel Mac OS X ${item.osToken}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${item.version} Safari/605.1.15`
  }));
}

function androidChromium(): readonly UserAgentPreset[] {
  return chromiumVersions.map((item) => {
    const suffix = item.browser === 'Edge' ? ` EdgA/${item.version}.0.0.0` : '';
    return {
      id: `android-${slug(item.browser)}-${item.version}`,
      browser: item.browser,
      label: `${item.browser} ${item.version} / Android 10+`,
      os: 'Android',
      osVersion: 'Android 10+',
      browserVersion: `${item.browser} ${item.version}`,
      userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${item.version}.0.0.0 Mobile Safari/537.36${suffix}`
    };
  });
}

function androidFirefox(): readonly UserAgentPreset[] {
  return androidFirefoxVersions.map((version) => ({
    id: `android-firefox-${version}`,
    browser: 'Firefox',
    label: `Firefox ${version} / Android 10+`,
    os: 'Android',
    osVersion: 'Android 10+',
    browserVersion: `Firefox ${version}`,
    userAgent: `Mozilla/5.0 (Android 10; Mobile; rv:${version}.0) Gecko/${version}.0 Firefox/${version}.0`
  }));
}

function samsungInternet(): readonly UserAgentPreset[] {
  const versions: readonly BrowserVersion[] = [
    { browser: 'Samsung Internet', version: 28 },
    { browser: 'Samsung Internet', version: 26 },
    { browser: 'Samsung Internet', version: 24 }
  ];
  return versions.map((item) => ({
    id: `android-samsung-${item.version}`,
    browser: item.browser,
    label: `${item.browser} ${item.version} / Android 10+`,
    os: 'Android',
    osVersion: 'Android 10+',
    browserVersion: `${item.browser} ${item.version}`,
    userAgent: `Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/${item.version}.0 Chrome/${item.version + 121}.0.0.0 Mobile Safari/537.36`
  }));
}

function iosSafari(): readonly UserAgentPreset[] {
  return iosSafariVersions.map((item) => ({
    id: `ios-safari-${slug(item.version)}`,
    browser: 'Safari',
    label: `Safari ${item.version} / ${item.osVersion}`,
    os: 'iOS',
    osVersion: item.osVersion,
    browserVersion: `Safari ${item.version}`,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS ${item.osToken} like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/${item.version} Mobile/15E148 Safari/604.1`
  }));
}

function iosChromium(): readonly UserAgentPreset[] {
  return [140, 148, 149, 136, 132, 128, 124].map((version) => ({
    id: `ios-chrome-${version}`,
    browser: 'Chrome iOS',
    label: `Chrome ${version} / iPhone iOS 18`,
    os: 'iOS',
    osVersion: 'iOS 18',
    browserVersion: `Chrome iOS ${version}`,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${version}.0.0.0 Mobile/15E148 Safari/604.1`
  }));
}

function iosFirefox(): readonly UserAgentPreset[] {
  return [140, 145, 152, 135, 128, 120].map((version) => ({
    id: `ios-firefox-${version}`,
    browser: 'Firefox iOS',
    label: `Firefox ${version} / iPhone iOS 18`,
    os: 'iOS',
    osVersion: 'iOS 18',
    browserVersion: `Firefox iOS ${version}`,
    userAgent: `Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/${version}.0 Mobile/15E148 Safari/605.1.15`
  }));
}

function slug(value: string): string {
  return value.toLowerCase().replaceAll(' ', '-').replaceAll('.', '-');
}
