import { request } from 'node:http';
import { performance } from 'node:perf_hooks';

import { anonymizeProxy, closeAnonymizedProxy } from 'proxy-chain';

import type { ProxyPoolItem } from '../shared/types';

interface IpWhoIsResponse {
  readonly success: boolean;
  readonly ip?: string;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly message?: string;
}

const IP_CHECK_URL = 'http://ipwho.is/';
const CHECK_TIMEOUT_MS = 15000;

/** 通过指定代理访问公网 IP 服务，确保代理池展示的是真实出口而不是本机网络。 */
export async function checkProxyPoolItem(proxy: ProxyPoolItem): Promise<ProxyPoolItem> {
  const startedAt = performance.now();
  let localProxyUrl: string | undefined;

  try {
    localProxyUrl = await anonymizeProxy(toProxyUrl(proxy));
    const data = await requestIpInfo(localProxyUrl);
    if (!data.success || !data.ip) {
      return toFailedProxy(proxy);
    }

    return {
      ...proxy,
      exitIp: data.ip,
      lastCheckedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      latency: Math.max(1, Math.round(performance.now() - startedAt)),
      region: buildRegionLabel(data),
      status: 'ok'
    };
  } catch {
    return toFailedProxy(proxy);
  } finally {
    if (localProxyUrl) {
      try {
        await closeAnonymizedProxy(localProxyUrl, true);
      } catch {
        // 临时代理清理失败不改变本次出口检测结论。
      }
    }
  }
}

/** 使用 HTTP 明文接口，避免 Node fetch 额外注入代理 agent。 */
async function requestIpInfo(localProxyUrl: string): Promise<IpWhoIsResponse> {
  const proxyUrl = new URL(localProxyUrl);
  const proxyPort = Number(proxyUrl.port);
  if (!proxyUrl.hostname || !Number.isInteger(proxyPort)) {
    throw new Error(`Invalid local proxy URL: ${localProxyUrl}`);
  }

  return new Promise((resolve, reject) => {
    const clientRequest = request({
      headers: {
        Accept: 'application/json',
        Host: 'ipwho.is'
      },
      host: proxyUrl.hostname,
      method: 'GET',
      path: IP_CHECK_URL,
      port: proxyPort,
      timeout: CHECK_TIMEOUT_MS
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => {
        body += chunk;
      });
      response.on('end', () => {
        if (!response.statusCode || response.statusCode >= 400) {
          reject(new Error(`IP check failed: ${response.statusCode ?? 'unknown'}`));
          return;
        }

        resolve(JSON.parse(body) as IpWhoIsResponse);
      });
    });

    clientRequest.on('error', reject);
    clientRequest.on('timeout', () => {
      clientRequest.destroy(new Error('Proxy IP check timed out.'));
    });
    clientRequest.end();
  });
}

/** 将代理池行转换为 proxy-chain 可消费的标准代理 URL。 */
function toProxyUrl(proxy: ProxyPoolItem): string {
  const url = new URL(`${proxy.protocol}://${proxy.host}`);
  url.port = String(proxy.port);
  url.username = proxy.username ?? '';
  url.password = proxy.password ?? '';
  return url.toString();
}

/** 检测失败时清空旧出口信息，避免继续展示过期 IP。 */
function toFailedProxy(proxy: ProxyPoolItem): ProxyPoolItem {
  return {
    ...proxy,
    exitIp: undefined,
    lastCheckedAt: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    latency: undefined,
    region: undefined,
    status: 'failed'
  };
}

/** 拼接国家、区域和城市；服务端缺字段时保持可读的未知区域文案。 */
function buildRegionLabel(data: IpWhoIsResponse): string {
  const parts = [data.country, data.region, data.city].filter(
    (value): value is string => Boolean(value)
  );
  return parts.length > 0 ? parts.join(' ') : '未知区域';
}
