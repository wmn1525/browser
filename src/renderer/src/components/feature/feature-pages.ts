import type { FeaturePageConfig } from './feature-page';

/** 左侧模块详细页配置，内容参考 AdsPower、Octo Browser、GoLogin、Dolphin Anty 操作文档。 */
export const featurePages: readonly FeaturePageConfig[] = [
  {
    key: 'groups',
    title: '分组管理',
    summary: '用于把不同业务、平台、团队成员的浏览器环境分层管理，常见操作包括创建分组、移动环境、按分组筛选和权限分配。',
    docRefs: ['AdsPower Groups', 'Octo Team Access'],
    cards: [
      {
        title: '分组列表',
        description: '像 AdsPower/Octo 一样，分组是 profile 的第一层组织方式。',
        steps: ['新建分组并命名业务场景', '查看每个分组下的环境数量', '删除空分组前提示影响范围'],
        actions: [
          { label: '新建分组', message: '分组创建面板已打开' },
          { label: '重命名分组', message: '请选择分组后重命名' }
        ]
      },
      {
        title: '移动环境',
        description: '批量把已选 profile 移动到指定分组，保持环境配置不变。',
        steps: ['勾选环境', '选择目标分组', '确认后刷新环境列表'],
        actions: [
          { label: '移动所选环境', message: '请在环境管理页勾选环境后移动' },
          { label: '查看操作文档', message: '参考 AdsPower Groups / Octo Team Settings' }
        ]
      }
    ]
  },
  {
    key: 'proxies',
    title: '代理管理',
    summary: '代理页沉淀为独立代理池，覆盖批量导入、连通性检测、状态筛选、profile 绑定、模板复用、换 IP 和到期提醒。',
    docRefs: ['AdsPower Proxy Check', 'Octo Proxy Manager', 'GoLogin Proxy Manager'],
    cards: [
      {
        title: '代理池列表',
        description: '像 Octo / GoLogin 一样把代理从 profile 表单里抽出来，保存为可复用资产。',
        steps: ['展示名称、协议、Host、端口、账号、国家地区和使用中的 profile 数量', '区分已保存代理和仅绑定单个 profile 的临时代理', '支持按名称、协议、地区、状态、标签和到期时间筛选'],
        actions: [
          { label: '新建代理', message: '代理新建面板已打开' },
          { label: '筛选代理', message: '代理筛选器已打开' }
        ]
      },
      {
        title: '批量导入',
        description: '支持一键粘贴多条代理，自动解析协议、认证信息和换 IP 链接。',
        steps: ['兼容 protocol://user:pass@host:port 与 host:port:user:pass', '粘贴后立即解析重复项、缺失端口和非法协议', '导入完成后自动进入待检测状态'],
        actions: [
          { label: '批量导入', message: '代理批量导入面板已打开' },
          { label: '格式示例', message: 'protocol://user:pass@host:port 或 host:port:user:pass' }
        ]
      },
      {
        title: '检测与状态',
        description: '保存前和批量使用前检测代理质量，避免启动 profile 后才发现不可用。',
        steps: ['批量检测出口 IP、国家地区、ISP、时区、延迟和最近检测时间', '用可用、不可用、待检测三类状态标记连接结果', '检测失败时保留错误信息，便于定位认证、网络或供应商问题'],
        actions: [
          { label: '批量检测', message: '代理批量检测任务已创建' },
          { label: '查看失败项', message: '已筛选连接失败的代理' }
        ]
      },
      {
        title: '绑定、轮换与团队',
        description: '代理既能单独绑定 profile，也能随模板批量复用，并给团队权限留下控制点。',
        steps: ['把代理分配到一个或多个 profile，或通过模板自动填充', '移动代理支持换 IP URL，执行后重新检测出口 IP', '记录到期时间、自动续费状态、团队可见范围和操作日志'],
        actions: [
          { label: '分配到环境', message: '请选择代理和环境后分配' },
          { label: '执行换 IP', message: '代理换 IP 链接待配置' }
        ]
      }
    ]
  },
  {
    key: 'apps',
    title: '应用中心',
    summary: '应用中心承载扩展、模板、启动页和常用脚本，参考 Octo Profile Templates 和浏览器扩展保存流程。',
    docRefs: ['Octo Templates', 'Chrome Extensions'],
    cards: [
      {
        title: 'Profile 模板',
        description: '模板用于复用代理、标签、扩展、启动页和指纹偏好。',
        steps: ['从现有 profile 保存模板', '从模板快速创建 profile', '模板创建后允许继续编辑参数'],
        actions: [
          { label: '创建模板', message: '模板创建面板已打开' },
          { label: '从模板创建', message: '请选择模板后创建浏览器' }
        ]
      },
      {
        title: '扩展管理',
        description: '集中管理本地扩展目录，后续启动 profile 时可挂载扩展。',
        steps: ['添加扩展目录', '绑定到模板或单个 profile', '启动浏览器后验证扩展状态'],
        actions: [
          { label: '添加扩展', message: '扩展目录选择面板待接入' },
          { label: '查看文档', message: '参考 Octo Browser extension/template 操作' }
        ]
      }
    ]
  },
  {
    key: 'automation',
    title: '自动化 / API',
    summary: '自动化页参考 AdsPower Local API、GoLogin API、Dolphin Anty DevTools 自动化流程，围绕 CDP 连接与脚本执行。',
    docRefs: ['AdsPower Local API', 'GoLogin API', 'Dolphin CDP'],
    cards: [
      {
        title: '本地 API',
        description: '暴露 profile 查询、创建、启动、关闭和状态检查接口。',
        steps: ['启用本地 API', '生成访问 token', '限制本机或局域网访问'],
        actions: [
          { label: '开启 API', message: '本地 API 开关面板已打开' },
          { label: '复制示例', message: 'GET /profiles, POST /profiles/:id/launch' }
        ]
      },
      {
        title: 'CDP / Puppeteer / Playwright',
        description: 'Chromium profile 启动后返回 wsEndpoint，可交给 Puppeteer 或 Playwright 连接。',
        steps: ['启动 Chromium profile', '读取 wsEndpoint', '脚本连接后执行自动化任务'],
        actions: [
          { label: '查看连接信息', message: '请先启动一个 profile，然后在详情中查看 wsEndpoint' },
          { label: '查看文档', message: '参考 Dolphin Anty / GoLogin 自动化文档' }
        ]
      }
    ]
  },
  {
    key: 'team',
    title: '团队协作',
    summary: '团队页参考 Octo 的邀请、成员权限、profile/template/proxy/tag 权限控制，以及 GoLogin 的 workspace 协作概念。',
    docRefs: ['Octo Team Settings', 'GoLogin Collaboration'],
    cards: [
      {
        title: '成员邀请',
        description: '邀请成员进入团队，并按角色分配权限。',
        steps: ['输入邮箱', '选择管理员或成员角色', '发送邀请并跟踪接受状态'],
        actions: [
          { label: '邀请成员', message: '成员邀请面板已打开' },
          { label: '撤销邀请', message: '请选择待接受邀请后撤销' }
        ]
      },
      {
        title: '权限与审计',
        description: '控制成员是否能查看、启动、编辑、删除 profile，并记录操作日志。',
        steps: ['配置 profile 权限', '配置代理和模板权限', '查看启动、编辑、删除日志'],
        actions: [
          { label: '权限设置', message: '团队权限设置面板已打开' },
          { label: '查看日志', message: '操作日志面板已打开' }
        ]
      }
    ]
  }
];

export function getFeaturePage(key: string): FeaturePageConfig | undefined {
  return featurePages.find((page) => page.key === key);
}
