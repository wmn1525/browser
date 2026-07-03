const tabs = document.querySelectorAll('[data-shot]');
const screenShot = document.querySelector('#screenShot');

for (const tab of tabs) {
  tab.addEventListener('click', () => {
    for (const item of tabs) item.classList.remove('active');
    tab.classList.add('active');
    const file = tab.getAttribute('data-shot');
    screenShot.src = `./img/${file}`;
    screenShot.alt = `Im-Run Browser ${tab.textContent}截图`;
  });
}

const platformLabels = {
  windows: 'Windows x64',
  'mac-arm64': 'macOS arm64',
  'mac-x64': 'macOS x64'
};

const fallbackDownloads = new Map();
const downloadCards = [...document.querySelectorAll('[data-download-card]')];

for (const card of downloadCards) {
  fallbackDownloads.set(card.dataset.platform, {
    href: card.href,
    title: card.querySelector('[data-title]')?.textContent ?? 'ImRun Browser'
  });
}

void hydrateDownloads();

async function hydrateDownloads() {
  const releases = await Promise.all(downloadCards.map((card) => loadRelease(card)));
  updateSmartDownload(releases.filter(Boolean));
  updateSummary(releases.filter(Boolean));
}

async function loadRelease(card) {
  const platform = card.dataset.platform;
  const manifestUrl = card.dataset.manifest;
  const title = card.querySelector('[data-title]');
  if (!platform || !manifestUrl || !title) return undefined;

  try {
    const response = await fetch(manifestUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Manifest request failed: ${response.status}`);
    const release = parseUpdaterManifest(await response.text(), manifestUrl, platform);
    card.href = release.url;
    title.textContent = `ImRun Browser ${release.version} ${platformLabels[platform]}`;
    card.dataset.version = release.version;
    return release;
  } catch {
    const fallback = fallbackDownloads.get(platform);
    if (fallback) {
      title.textContent = fallback.title;
      return { platform, url: fallback.href, version: parseVersion(fallback.title) ?? 'latest' };
    }
    return undefined;
  }
}

function parseUpdaterManifest(yml, manifestUrl, platform) {
  const version = getYamlValue(yml, 'version') ?? 'latest';
  const fileUrl = getFirstFileUrl(yml) ?? getYamlValue(yml, 'path');
  if (!fileUrl) throw new Error('Manifest has no file url.');
  return {
    platform,
    url: new URL(fileUrl, manifestUrl).href,
    version
  };
}

function getYamlValue(yml, key) {
  const match = yml.match(new RegExp(`^${key}:\\s*['"]?(.+?)['"]?\\s*$`, 'm'));
  return match?.[1]?.trim();
}

function getFirstFileUrl(yml) {
  const lines = yml.split(/\r?\n/);
  const filesIndex = lines.findIndex((line) => line.trim() === 'files:');
  if (filesIndex < 0) return undefined;

  for (const line of lines.slice(filesIndex + 1)) {
    if (/^\S/.test(line)) break;
    const match = line.match(/^\s*-\s+url:\s*['"]?(.+?)['"]?\s*$/) ?? line.match(/^\s*url:\s*['"]?(.+?)['"]?\s*$/);
    if (match?.[1]) return match[1].trim();
  }

  return undefined;
}

function parseVersion(text) {
  return text.match(/\d+\.\d+\.\d+/)?.[0];
}

function updateSmartDownload(releases) {
  const smartDownload = document.querySelector('#smartDownload');
  if (!smartDownload) return;

  const userAgent = navigator.userAgent.toLowerCase();
  const platform = userAgent.includes('mac') ? 'mac-arm64' : 'windows';
  const release = releases.find((item) => item.platform === platform)
    ?? releases.find((item) => item.platform === 'windows');
  if (!release) return;

  smartDownload.href = release.url;
  smartDownload.dataset.platform = release.platform;
  smartDownload.textContent = release.platform === 'windows'
    ? `下载 Windows ${release.version}`
    : `下载 macOS ${release.version}`;
}

function updateSummary(releases) {
  const summary = document.querySelector('#downloadSummary');
  if (!summary || releases.length === 0) return;

  const windows = releases.find((item) => item.platform === 'windows')?.version ?? 'latest';
  const macArm = releases.find((item) => item.platform === 'mac-arm64')?.version ?? 'latest';
  const macX64 = releases.find((item) => item.platform === 'mac-x64')?.version ?? 'latest';
  summary.textContent = `已自动读取最新版本：Windows ${windows}，macOS Apple Silicon ${macArm}，macOS Intel ${macX64}。`;
}
