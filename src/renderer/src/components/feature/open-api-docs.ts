/** API&MCP 页面使用的接口文档数据和可复制 Markdown 文档。 */

/** 本地 Open API 文档项，保持 UI 展示和复制文档使用同一份数据源。 */
export interface EndpointDoc {
  /** HTTP 方法，用于渲染方法标签和生成文档标题。 */
  readonly method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /** 不含 `/open-api` 前缀的接口路径。 */
  readonly path: string;
  /** 接口在文档中的中文名称。 */
  readonly title: string;
  /** 解释接口用途和关键约束。 */
  readonly description: string;
  /** 可以直接复制执行的 curl 示例。 */
  readonly request: string;
  /** 格式化后的返回示例。 */
  readonly response: string;
}

/** 构造 API&MCP 页面展示的接口清单。 */
export function buildEndpointDocs(baseUrl: string, apiKey: string): readonly EndpointDoc[] {
  return [
    doc('GET', '/health', '检查服务', '确认本地 Open API 服务可用。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/health"`, { status: 'ok' }),
    doc('GET', '/profiles', '读取 profile', '返回本地保存的 profile 列表和运行状态。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles"`, [{ id: 'profile-id', name: 'Demo', isRunning: false }]),
    doc('POST', '/profiles', '创建或更新 profile', '请求体使用当前项目的 ProfileDraft 字段；传入 id 时执行更新或创建。', `curl -X POST "${baseUrl}/profiles" -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" -d "{\\"name\\":\\"Demo\\",\\"startUrls\\":[\\"https://example.com\\"],\\"tags\\":[]}"`, { id: 'profile-id', name: 'Demo' }),
    doc('POST', '/profiles/{profile_id}/start', '启动 profile', '启动 Chromium 时返回 port、debug_port、debug_url 和 wsEndpoint。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles/PROFILE_ID/start"`, { profileId: 'PROFILE_ID', port: 9222, debug_port: 9222, debug_url: 'http://127.0.0.1:9222', wsEndpoint: 'ws://127.0.0.1:9222/devtools/browser/test' }),
    doc('POST', '/profiles/{profile_id}/stop', '关闭 profile', '关闭指定 profile 对应的浏览器进程。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/profiles/PROFILE_ID/stop"`, { profileId: 'PROFILE_ID', status: 'stopped' }),
    doc('GET', '/groups', '读取分组', '返回本地 profile 分组列表。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/groups"`, [{ id: 'group-id', name: 'Group' }]),
    doc('POST', '/groups/{group_id}/start', '按分组启动', '批量启动某个分组下的 profile，未分组使用 `_ungrouped_`。', `curl -X POST -H "X-API-Key: ${apiKey}" "${baseUrl}/groups/GROUP_ID/start"`, [{ profileId: 'profile-id', port: 9222 }]),
    doc('GET', '/proxies', '读取代理池', '返回代理管理中保存的代理列表。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/proxies"`, [{ id: 'proxy-id', protocol: 'http', host: '127.0.0.1', port: 7890 }]),
    doc('GET', '/extensions?engine=chromium', '读取扩展', '返回应用中心扩展列表，可按 chromium/firefox 过滤。', `curl -H "X-API-Key: ${apiKey}" "${baseUrl}/extensions?engine=chromium"`, [{ id: 'extension-id', engine: 'chromium', enabled: true }]),
    doc('PUT', '/extensions/{extension_id}', '更新扩展', '修改扩展显示名或全局启用状态。', `curl -X PUT "${baseUrl}/extensions/EXTENSION_ID" -H "X-API-Key: ${apiKey}" -H "Content-Type: application/json" -d "{\\"enabled\\":false}"`, { id: 'extension-id', enabled: false }),
    doc('DELETE', '/extensions/{extension_id}', '删除扩展', '删除扩展元数据和本地文件，并清理 profile 禁用记录。', `curl -X DELETE -H "X-API-Key: ${apiKey}" "${baseUrl}/extensions/EXTENSION_ID"`, { ok: true })
  ];
}

/** 生成一键复制的 Markdown 文档，外部脚本或 MCP 配置可以直接按此接入。 */
export function buildOpenApiDocumentation(baseUrl: string, apiKey: string): string {
  const endpoints = buildEndpointDocs(baseUrl, apiKey);
  const endpointDocs = endpoints.map((endpoint) => [
    `## ${endpoint.method} ${endpoint.path}`,
    endpoint.description,
    '',
    '请求示例：',
    '```bash',
    endpoint.request,
    '```',
    '',
    '返回示例：',
    '```json',
    endpoint.response,
    '```'
  ].join('\n')).join('\n\n');

  return [
    '# API&MCP',
    '',
    '## 鉴权',
    `Base URL: ${baseUrl}`,
    `API Key: ${apiKey}`,
    '请求头支持 `X-API-Key: <key>` 或 `Authorization: Bearer <key>`。',
    '',
    '## MCP 接入说明',
    'MCP Server 可以把本地 Open API 包装为工具调用：先调用 `/profiles` 获取环境，再调用 `/profiles/{profile_id}/start` 启动并读取 `wsEndpoint`，随后交给 Playwright 或 Puppeteer 连接。',
    '',
    '## 接口',
    endpointDocs
  ].join('\n');
}

/** HTTP 方法和 Ant Design 标签颜色之间的稳定映射。 */
export function methodColor(method: EndpointDoc['method']): string {
  if (method === 'GET') return 'green';
  if (method === 'POST') return 'blue';
  if (method === 'DELETE') return 'red';
  return 'orange';
}

function doc(
  method: EndpointDoc['method'],
  path: string,
  title: string,
  description: string,
  request: string,
  response: object
): EndpointDoc {
  return { method, path, title, description, request, response: JSON.stringify(response, null, 2) };
}
