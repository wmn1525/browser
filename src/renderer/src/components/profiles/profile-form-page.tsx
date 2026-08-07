import { Tabs } from 'antd';
import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { BrowserKernelInfo, ProfileDetail, ProfileDraft, ProfileGroup } from '../../../../shared/types';
import {
  AccountTab,
  BaseTab,
  FormFooter,
  SummaryPanel
} from './profile-form-fields';
import { AppsTab } from './profile-apps-tab';
import { FingerprintTab } from './profile-fingerprint-tab';
import { getDefaultKernelId, getKernelLabel } from './browser-kernel-options';
import { buildProfileDraft } from './profile-form-draft';
import { ProxyTab } from './profile-proxy-tab';
import { getDefaultOsVersion, getDefaultPreset, getOsVersionOptions, getPresetByUserAgent, getPresetsForOs, getRandomPresetForOs } from './user-agent-options';

interface ProfileFormPageProps {
  readonly groups: readonly ProfileGroup[];
  readonly initialProfile?: ProfileDetail;
  readonly onCancel: () => void;
  readonly onSubmit: (draft: ProfileDraft) => Promise<void>;
  readonly tagOptions: readonly string[];
}

/** 主内容区的新建/编辑页，不使用弹窗。 */
export function ProfileFormPage({ groups, initialProfile, onCancel, onSubmit, tagOptions }: ProfileFormPageProps): JSX.Element {
  const [os, setOs] = useState(initialProfile?.os ?? 'Windows');
  const matchedPreset = getPresetByUserAgent(os, initialProfile?.userAgent) ?? getDefaultPreset(os);
  const [uaPresetId, setUaPresetId] = useState(matchedPreset.id);
  const [kernel, setKernel] = useState(getDefaultKernelId(initialProfile?.browserKernel));
  const [osVersion, setOsVersion] = useState(initialProfile?.osVersion ?? getDefaultOsVersion(os));
  const [userAgent, setUserAgent] = useState(initialProfile?.userAgent ?? matchedPreset.userAgent);
  const [kernels, setKernels] = useState<readonly BrowserKernelInfo[]>([]);
  const [downloadingKernelId, setDownloadingKernelId] = useState<string>();
  const [loadImages, setLoadImages] = useState(initialProfile?.loadImages ?? true);
  const [loadVideos, setLoadVideos] = useState(initialProfile?.loadVideos ?? true);
  const [fingerprintRandomSeed, setFingerprintRandomSeed] = useState(0);

  const summary = useMemo(() => ({
    kernel: getKernelLabel(kernel),
    loadImages,
    loadVideos,
    os,
    osVersion,
    userAgent
  }), [kernel, loadImages, loadVideos, os, osVersion, userAgent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    await onSubmit(buildProfileDraft(new FormData(event.currentTarget), initialProfile));
  }

  async function refreshKernels(): Promise<void> {
    const nextKernels = await window.browserShell.listBrowserKernels();
    setKernels(nextKernels);
    const selected = nextKernels.find((item) => item.id === kernel);
    if (selected && !selected.isInstalled) {
      setKernel('system-chrome');
    }
  }

  async function downloadKernel(kernelId: string): Promise<void> {
    setDownloadingKernelId(kernelId);
    try {
      await window.browserShell.downloadBrowserKernel(kernelId);
      await refreshKernels();
    } finally {
      setDownloadingKernelId(undefined);
    }
  }

  useEffect(() => {
    void refreshKernels();
  }, []);

  useEffect(() => {
    if (!getOsVersionOptions(os).includes(osVersion)) {
      setOsVersion(getDefaultOsVersion(os));
    }
  }, [os, osVersion]);

  function randomizeFingerprint(): void {
    const preset = getRandomPresetForOs(os, uaPresetId);
    setUaPresetId(preset.id);
    setUserAgent(preset.userAgent);
    setFingerprintRandomSeed((seed) => seed + 1);
  }

  function selectOs(nextOs: string): void {
    const preset = getDefaultPreset(nextOs);
    setOs(nextOs);
    setUaPresetId(preset.id);
    setOsVersion(getDefaultOsVersion(nextOs));
    setUserAgent(preset.userAgent);
  }

  function selectUaPreset(presetId: string): void {
    const preset = getPresetsForOs(os).find((item) => item.id === presetId) ?? getDefaultPreset(os);
    setUaPresetId(preset.id);
    setUserAgent(preset.userAgent);
  }

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => void handleSubmit(event)}>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-y-auto bg-background p-6">
          <Tabs
            defaultActiveKey="base"
            items={[
              { children: <BaseTab downloadingKernelId={downloadingKernelId} groups={groups} initialProfile={initialProfile} kernel={kernel} kernels={kernels} onDownloadKernel={(id) => void downloadKernel(id)} os={os} osVersion={osVersion} setKernel={setKernel} setOs={selectOs} setOsVersion={setOsVersion} setUserAgent={setUserAgent} setUaPreset={selectUaPreset} tagOptions={tagOptions} uaPresetId={uaPresetId} userAgent={userAgent} />, forceRender: true, key: 'base', label: '基础信息' },
              { children: <ProxyTab initialProfile={initialProfile} />, forceRender: true, key: 'proxy', label: '代理配置' },
              { children: <AccountTab initialProfile={initialProfile} />, forceRender: true, key: 'account', label: '账号平台' },
              { children: <AppsTab initialProfile={initialProfile} kernel={kernel} loadImages={loadImages} loadVideos={loadVideos} setLoadImages={setLoadImages} setLoadVideos={setLoadVideos} />, forceRender: true, key: 'apps', label: '应用配置' },
              { children: <FingerprintTab initialProfile={initialProfile} os={os} randomSeed={fingerprintRandomSeed} />, forceRender: true, key: 'fingerprint', label: '指纹信息' }
            ]}
          />
        </div>
        <SummaryPanel onRandomize={randomizeFingerprint} summary={summary} />
      </div>
      <FormFooter onCancel={onCancel} />
    </form>
  );
}
