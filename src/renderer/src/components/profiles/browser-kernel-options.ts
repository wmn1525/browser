import type { BrowserKernelEngine } from '../../../../shared/types';

export interface BrowserKernelOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly engine: BrowserKernelEngine;
  readonly majorVersion?: number;
  readonly version: string;
}

export const browserKernelOptions: readonly BrowserKernelOption[] = [
  {
    id: 'system-chrome',
    label: '本机 Chrome',
    description: '使用系统已安装 Chrome，兼容性最好',
    engine: 'chromium',
    version: 'system'
  },
  {
    id: 'system-firefox',
    label: '本机 Firefox',
    description: '启动真实 Firefox/Gecko 浏览器进程',
    engine: 'firefox',
    version: 'system'
  },
  {
    id: 'firefox-latest',
    label: 'Firefox 最新稳定版',
    description: '下载 Mozilla 官方 Windows 64-bit Firefox',
    engine: 'firefox',
    version: 'latest'
  },
  firefox('firefox-152', 'Firefox 152.0.4', '152.0.4', 'Mozilla 官方稳定版'),
  firefox('firefox-140-esr', 'Firefox 140.6.0 ESR', '140.6.0esr', 'Mozilla 官方 ESR 稳定版'),
  firefox('firefox-128-esr', 'Firefox 128.14.0 ESR', '128.14.0esr', 'Mozilla 官方 ESR 稳定版'),
  firefox('firefox-120', 'Firefox 120.0', '120.0', 'Mozilla 官方历史稳定版'),
  kernel(151, '151.0.7921.0', '最新测试里程碑版本'),
  kernel(150, '150.0.7871.46', '当前较新版本'),
  kernel(149, '149.0.7827.155', '接近当前常用版本'),
  kernel(148, '148.0.7778.178', '接近当前常用版本'),
  kernel(147, '147.0.7727.117', '历史版本'),
  kernel(146, '146.0.7680.165', '历史版本'),
  kernel(145, '145.0.7632.117', '历史版本'),
  kernel(144, '144.0.7559.133', '历史版本'),
  kernel(143, '143.0.7499.192', '历史版本'),
  kernel(142, '142.0.7444.175', '历史版本'),
  kernel(141, '141.0.7390.122', '历史版本'),
  kernel(140, '140.0.7339.207', '推荐，稳定且不过新'),
  kernel(136, '136.0.7103.113', '较新的历史版本'),
  kernel(132, '132.0.6834.159', '常用历史版本'),
  kernel(128, '128.0.6613.137', '常用历史版本'),
  kernel(124, '124.0.6367.207', '常用历史版本'),
  kernel(120, '120.0.6099.109', '历史稳定版本，兼容老账号环境')
];

export function getKernelLabel(kernelId: string): string {
  return browserKernelOptions.find((option) => option.id === kernelId)?.label ?? kernelId;
}

export function getDefaultKernelId(kernelId: string | undefined): string {
  return kernelId && browserKernelOptions.some((option) => option.id === kernelId) ? kernelId : 'system-chrome';
}

export function getKernelDescription(kernelId: string): string {
  return browserKernelOptions.find((option) => option.id === kernelId)?.description ?? '';
}

function kernel(majorVersion: number, version: string, description: string): BrowserKernelOption {
  return {
    id: `chrome-${majorVersion}`,
    label: `Chrome ${version}`,
    description,
    engine: 'chromium',
    majorVersion,
    version
  };
}

function firefox(id: string, label: string, version: string, description: string): BrowserKernelOption {
  return {
    id,
    label,
    description,
    engine: 'firefox',
    version
  };
}
