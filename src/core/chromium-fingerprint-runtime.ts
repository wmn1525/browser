import CDP from 'chrome-remote-interface';

import type { FingerprintDraft } from '../shared/types';
import type { ExtendedStoredProfile } from './profile-dto-mapper';

/** Client Hints 注入只保存浏览器脚本需要的稳定字段。 */
interface ClientHintsPatch {
  readonly platform: string;
  readonly platformVersion: string;
  readonly architecture: string;
  readonly mobile: boolean;
  readonly brandVersion: string;
}

/** Chromium 补充脚本配置，字段缺失表示对应检测面不处理。 */
interface ChromiumFingerprintPatch {
  readonly languages?: readonly string[];
  readonly screenColorDepth?: number;
  readonly screenPixelDepth?: number;
  readonly clientHints?: ClientHintsPatch;
  readonly disableWebGpu: boolean;
  readonly disableServiceWorker: boolean;
  readonly domRectSalt?: number;
  readonly fontSalt?: string;
}

/** 构建 Chromium 新文档补充脚本；无补充项时返回空字符串。 */
export function buildChromiumFingerprintPatchSource(profile: ExtendedStoredProfile): string {
  const patch = buildPatch(profile.fingerprint);
  if (!hasPatch(patch)) {
    return '';
  }

  return `
(() => {
  const config = ${JSON.stringify(patch)};
  const defineGetter = (target, name, value) => {
    try {
      Object.defineProperty(target, name, { configurable: true, get: () => value });
    } catch {
      try {
        Object.defineProperty(target, name, { configurable: true, value });
      } catch {}
    }
  };

  if (Array.isArray(config.languages) && config.languages.length > 0) {
    const language = config.languages[0];
    defineGetter(Navigator.prototype, 'language', language);
    defineGetter(Navigator.prototype, 'languages', Object.freeze([...config.languages]));
  }

  if (typeof config.screenColorDepth === 'number' && screen.colorDepth !== config.screenColorDepth) {
    defineGetter(Screen.prototype, 'colorDepth', config.screenColorDepth);
  }
  if (typeof config.screenPixelDepth === 'number' && screen.pixelDepth !== config.screenPixelDepth) {
    defineGetter(Screen.prototype, 'pixelDepth', config.screenPixelDepth);
  }

  if (config.clientHints && navigator.userAgentData) {
    const brands = [
      { brand: 'Chromium', version: config.clientHints.brandVersion },
      { brand: 'Google Chrome', version: config.clientHints.brandVersion },
      { brand: 'Not_A Brand', version: '8' }
    ];
    const userAgentData = {
      brands,
      mobile: config.clientHints.mobile,
      platform: config.clientHints.platform,
      getHighEntropyValues: () => Promise.resolve({
        architecture: config.clientHints.architecture,
        brands,
        fullVersionList: brands,
        mobile: config.clientHints.mobile,
        model: '',
        platform: config.clientHints.platform,
        platformVersion: config.clientHints.platformVersion,
        uaFullVersion: config.clientHints.brandVersion + '.0.0.0'
      }),
      toJSON: () => ({
        brands,
        mobile: config.clientHints.mobile,
        platform: config.clientHints.platform
      })
    };
    defineGetter(Navigator.prototype, 'userAgentData', userAgentData);
  }

  if (config.disableWebGpu && 'gpu' in navigator) {
    defineGetter(Navigator.prototype, 'gpu', undefined);
  }

  if (config.disableServiceWorker && 'serviceWorker' in navigator) {
    defineGetter(Navigator.prototype, 'serviceWorker', undefined);
  }

  if (typeof config.domRectSalt === 'number' && Element.prototype.getBoundingClientRect) {
    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function() {
      const rect = originalGetBoundingClientRect.call(this);
      const offset = config.domRectSalt / 1000;
      return new DOMRect(rect.x + offset, rect.y + offset, rect.width, rect.height);
    };
  }

  if (typeof config.fontSalt === 'string' && document.fonts && document.fonts.check) {
    const originalCheck = document.fonts.check.bind(document.fonts);
    document.fonts.check = (font, text) => {
      const result = originalCheck(font, text);
      if (!result) {
        return false;
      }
      const salt = config.fontSalt.charCodeAt(0) % 5;
      return salt === 0 ? font.length % 2 === 0 : result;
    };
  }
})();
`;
}

/** 注入 Chromium 新文档脚本；没有补充脚本时直接跳过。 */
export async function injectChromiumFingerprintPatch(port: number, profile: ExtendedStoredProfile): Promise<void> {
  const source = buildChromiumFingerprintPatchSource(profile);
  if (!source) {
    return;
  }

  const client = await CDP({ port });
  try {
    await client.Page.enable();
    await client.Page.addScriptToEvaluateOnNewDocument({ source });
  } finally {
    await client.close();
  }
}

function buildPatch(fingerprint: FingerprintDraft | undefined): ChromiumFingerprintPatch {
  return {
    languages: parseLanguages(fingerprint?.languages ?? fingerprint?.language),
    screenColorDepth: fingerprint?.screenColorDepth,
    screenPixelDepth: fingerprint?.screenPixelDepth,
    clientHints: buildClientHints(fingerprint),
    disableWebGpu: fingerprint?.webgpuMode === 'disabled',
    disableServiceWorker: fingerprint?.serviceWorkerMode === 'disabled',
    domRectSalt: isActiveMode(fingerprint?.rectsMode) ? saltNumber(fingerprint?.rectsValue) : undefined,
    fontSalt: isActiveMode(fingerprint?.fontsMode) ? fingerprint?.fontsValue : undefined
  };
}

function hasPatch(patch: ChromiumFingerprintPatch): boolean {
  return Boolean(
    patch.languages?.length ||
    patch.screenColorDepth ||
    patch.screenPixelDepth ||
    patch.clientHints ||
    patch.disableWebGpu ||
    patch.disableServiceWorker ||
    patch.domRectSalt !== undefined ||
    patch.fontSalt !== undefined
  );
}

function buildClientHints(fingerprint: FingerprintDraft | undefined): ClientHintsPatch | undefined {
  if (!fingerprint || !isActiveMode(fingerprint.clientHintsMode) || !fingerprint.clientHintsPlatform) {
    return undefined;
  }

  return {
    platform: fingerprint.clientHintsPlatform,
    platformVersion: fingerprint.clientHintsPlatformVersion ?? '10.0.0',
    architecture: fingerprint.clientHintsArchitecture ?? 'x86',
    mobile: fingerprint.clientHintsMobile ?? false,
    brandVersion: fingerprint.clientHintsBrandVersion ?? '140'
  };
}

function parseLanguages(value: string | undefined): readonly string[] | undefined {
  const languages = value?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  return languages.length > 0 ? languages : undefined;
}

function isActiveMode(value: string | undefined): boolean {
  return Boolean(value && value !== 'default' && value !== 'disabled');
}

function saltNumber(value: string | undefined): number | undefined {
  const source = value ?? '';
  if (!source) {
    return undefined;
  }

  return Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0) % 10;
}
