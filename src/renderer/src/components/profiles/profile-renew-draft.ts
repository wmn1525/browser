import type { FingerprintHookMode, ProfileDetail, ProfileDraft } from '../../../../shared/types';
import { toProfileDraft } from '../../app-helpers';
import { getDefaultPreset, getPresetByUserAgent, getRandomPresetForOs } from './user-agent-options';
import { getRandomValues, getScreenDepth } from './profile-fingerprint-values';

/** 根据现有环境生成换新 DTO：保留业务归属字段，只刷新 UA 与指纹信息。 */
export function buildRenewProfileDraft(detail: ProfileDetail): ProfileDraft {
  const os = detail.os ?? 'Windows';
  const currentPreset = getPresetByUserAgent(os, detail.userAgent) ?? getDefaultPreset(os);
  const nextPreset = getRandomPresetForOs(os, currentPreset.id);
  const values = getRandomValues(os);
  const depth = getScreenDepth(values.screenDepth);
  return toProfileDraft(detail, {
    osVersion: nextPreset.osVersion,
    userAgent: nextPreset.userAgent,
    timezone: values.timezone,
    fingerprint: {
      platform: values.platform,
      language: values.language,
      languages: values.languages,
      hardwareConcurrency: toPositiveInt(values.cpu),
      deviceMemory: toPositiveInt(values.memory),
      screenWidth: values.screen.width,
      screenHeight: values.screen.height,
      screenColorDepth: depth.colorDepth,
      screenPixelDepth: depth.pixelDepth,
      webglVendor: values.gpu.vendor,
      webglRenderer: values.gpu.renderer,
      hstsMode: toHookMode(values.hstsMode),
      hstsValue: values.hstsValue,
      webglMode: toHookMode(values.webglMode),
      webglValue: values.webglValue,
      canvasMode: toHookMode(values.canvasMode),
      canvasValue: values.canvasValue,
      pluginsMode: toHookMode(values.pluginsMode),
      pluginsValue: values.pluginsValue,
      rectsMode: toHookMode(values.rectsMode),
      rectsValue: values.rectsValue,
      fontsMode: toHookMode(values.fontsMode),
      fontsValue: values.fontsValue,
      clientHintsMode: toHookMode(values.clientHintsMode),
      clientHintsPlatform: values.clientHintsPlatform,
      clientHintsPlatformVersion: values.clientHintsPlatformVersion,
      clientHintsArchitecture: values.clientHintsArchitecture,
      clientHintsMobile: values.clientHintsMobile === 'true',
      clientHintsBrandVersion: values.clientHintsBrandVersion,
      audioMode: toHookMode(values.audioMode),
      audioValue: values.audioValue,
      webgpuMode: toHookMode(values.webgpuMode),
      webgpuValue: values.webgpuValue,
      webrtcMode: toHookMode(values.webrtcMode),
      serviceWorkerMode: toHookMode(values.serviceWorkerMode),
      batteryState: values.batteryState,
      bluetoothState: values.bluetoothState,
      networkState: values.networkState
    }
  });
}

function toPositiveInt(value: string): number | undefined {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toHookMode(value: string): FingerprintHookMode | undefined {
  switch (value) {
    case 'default':
    case 'value':
    case 'page':
    case 'browser':
    case 'domain':
    case 'global':
    case 'enabled':
    case 'disabled':
      return value;
    default:
      return undefined;
  }
}
