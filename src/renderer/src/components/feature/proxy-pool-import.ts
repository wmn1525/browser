import type { ProxyPoolDraft, ProxyPoolProtocol } from './proxy-pool-types';

/** 批量导入支持 URL 格式和 host:port:user:pass 格式。 */
export function parseProxyPoolInput(text: string): readonly ProxyPoolDraft[] {
  return text
    .split(/[\r\n]+/)
    .map((line) => parseProxyLine(line.trim()))
    .filter((draft): draft is ProxyPoolDraft => Boolean(draft));
}

/** 解析单行代理，解析失败时返回 undefined 便于跳过空行或非法行。 */
export function parseProxyLine(line: string): ProxyPoolDraft | undefined {
  if (!line) {
    return undefined;
  }

  const urlDraft = parseProxyUrl(line);
  if (urlDraft) {
    return urlDraft;
  }

  const parts = line.replace(/\s+/g, ':').split(':').map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) {
    return undefined;
  }

  const firstPart = parts[0]?.toLowerCase();
  const hasProtocolPrefix = isProxyProtocol(firstPart);
  const protocol = hasProtocolPrefix ? firstPart : 'http';
  const hostIndex = hasProtocolPrefix ? 1 : 0;
  const port = Number(parts[hostIndex + 1]);

  if (!parts[hostIndex] || !Number.isInteger(port) || port <= 0) {
    return undefined;
  }

  return {
    host: parts[hostIndex],
    password: parts[hostIndex + 3],
    port,
    protocol,
    remark: '',
    tags: [],
    username: parts[hostIndex + 2]
  };
}

/** URL 格式能准确表达协议、账号密码和 host。 */
function parseProxyUrl(line: string): ProxyPoolDraft | undefined {
  try {
    const url = new URL(line);
    const protocol = url.protocol.replace(':', '').toLowerCase();
    const port = Number(url.port);
    if (!isProxyProtocol(protocol) || !url.hostname || !Number.isInteger(port)) {
      return undefined;
    }

    return {
      host: url.hostname,
      password: url.password ? decodeURIComponent(url.password) : undefined,
      port,
      protocol,
      remark: '',
      tags: [],
      username: url.username ? decodeURIComponent(url.username) : undefined
    };
  } catch {
    return undefined;
  }
}

function isProxyProtocol(value: string | undefined): value is ProxyPoolProtocol {
  return value === 'http' || value === 'https' || value === 'socks5';
}
