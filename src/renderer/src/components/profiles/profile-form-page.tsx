import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';

import type { BrowserKernelInfo, ProfileDetail, ProfileDraft } from '../../../../shared/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  AccountTab,
  AppsTab,
  BaseTab,
  FormFooter,
  SummaryPanel
} from './profile-form-fields';
import { FingerprintTab } from './profile-fingerprint-tab';
import { getDefaultKernelId, getKernelLabel } from './browser-kernel-options';
import { buildProfileDraft } from './profile-form-draft';
import { ProxyTab } from './profile-proxy-tab';
import { getDefaultOsVersion, getDefaultPreset, getOsVersionOptions, getPresetByUserAgent, getPresetsForOs, getRandomPresetForOs } from './user-agent-options';

interface ProfileFormPageProps {
  readonly initialProfile?: ProfileDetail;
  readonly onCancel: () => void;
  readonly onSubmit: (draft: ProfileDraft) => Promise<void>;
}

/** 主内容区的新建/编辑页，不使用弹窗。 */
export function ProfileFormPage({ initialProfile, onCancel, onSubmit }: ProfileFormPageProps): JSX.Element {
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
      <Tabs className="flex min-h-0 flex-1 flex-col" defaultValue="base">
        <TabsList>
          <TabsTrigger value="base">基础信息</TabsTrigger>
          <TabsTrigger value="proxy">代理配置</TabsTrigger>
          <TabsTrigger value="account">账号平台</TabsTrigger>
          <TabsTrigger value="apps">应用配置</TabsTrigger>
          <TabsTrigger value="fingerprint">指纹信息</TabsTrigger>
        </TabsList>

        <div className="flex min-h-0 flex-1">
          <div className="min-w-0 flex-1 overflow-y-auto bg-background p-6">
            <TabsContent forceMount value="base"><BaseTab downloadingKernelId={downloadingKernelId} initialProfile={initialProfile} kernel={kernel} kernels={kernels} onDownloadKernel={(id) => void downloadKernel(id)} os={os} osVersion={osVersion} setKernel={setKernel} setOs={selectOs} setOsVersion={setOsVersion} setUserAgent={setUserAgent} setUaPreset={selectUaPreset} uaPresetId={uaPresetId} userAgent={userAgent} /></TabsContent>
            <TabsContent forceMount value="proxy"><ProxyTab initialProfile={initialProfile} /></TabsContent>
            <TabsContent forceMount value="account"><AccountTab initialProfile={initialProfile} /></TabsContent>
            <TabsContent forceMount value="apps"><AppsTab initialProfile={initialProfile} loadImages={loadImages} loadVideos={loadVideos} setLoadImages={setLoadImages} setLoadVideos={setLoadVideos} /></TabsContent>
            <TabsContent forceMount value="fingerprint"><FingerprintTab initialProfile={initialProfile} os={os} randomSeed={fingerprintRandomSeed} /></TabsContent>
          </div>
          <SummaryPanel onRandomize={randomizeFingerprint} summary={summary} />
        </div>
      </Tabs>
      <FormFooter onCancel={onCancel} />
    </form>
  );
}
