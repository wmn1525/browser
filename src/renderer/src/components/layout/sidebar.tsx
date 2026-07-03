import { Button } from 'antd';
import { AppWindow, Bolt, CloudCog, Folder, Globe2, Grid2X2, Plus, Settings, Users, type LucideIcon } from 'lucide-react';

import { isAutomationModule, type ModuleKey } from '../feature/feature-page';

interface SidebarProps {
  readonly activeModule: ModuleKey;
  readonly onNavigate: (module: ModuleKey) => void;
  readonly onCreateProfile: () => void;
}

interface NavItem {
  readonly key: ModuleKey;
  readonly label: string;
  readonly icon: LucideIcon;
  readonly children?: readonly NavChild[];
}

interface NavChild {
  readonly key: ModuleKey;
  readonly label: string;
}

const automationChildren: readonly NavChild[] = [
  { key: 'automation-api-mcp', label: 'API&MCP' },
  { key: 'automation-window-sync', label: '窗口同步' }
];

const navItems: readonly NavItem[] = [
  { key: 'profiles', label: '环境管理', icon: Grid2X2 },
  { key: 'groups', label: '分组管理', icon: Folder },
  { key: 'proxies', label: '代理管理', icon: Globe2 },
  { key: 'apps', label: '应用中心', icon: AppWindow },
  { key: 'automation-api-mcp', label: '自动化', icon: Bolt, children: automationChildren },
  { key: 'settings', label: '设置中心', icon: Settings },
  { key: 'team', label: '团队', icon: Users }
] as const;

/** 左侧主导航，保持参考页面的信息结构。 */
export function Sidebar({ activeModule, onCreateProfile, onNavigate }: SidebarProps): JSX.Element {
  return (
    <aside className="flex w-[200px] shrink-0 flex-col border-r bg-card p-3">
      <div className="px-3 pb-6">
        <div className="flex items-center gap-2 text-xl font-bold text-primary">
          <CloudCog className="size-6" />
          <span>Im-Run Browser</span>
        </div>
        <p className="mt-1 text-[10px] uppercase text-muted-foreground">v {__APP_VERSION__}</p>
      </div>

      <Button className="mb-4 w-full" htmlType="button" onClick={onCreateProfile} type="primary">
        <Plus className="size-4" />
        新建浏览器
      </Button>

      <nav className="grid gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isTeamBlock = item.key === 'team';
          const isActive = item.children
            ? item.children.some((child) => child.key === activeModule)
            : item.key === activeModule;
          return (
            <div key={item.label}>
              {isTeamBlock ? (
                <div className="px-4 pb-2 pt-4 text-xs font-semibold text-muted-foreground">团队协作</div>
              ) : null}
              <button
                className={
                  isActive
                    ? 'flex w-full items-center gap-3 rounded-lg bg-primary/5 px-4 py-2.5 text-left font-medium text-primary'
                    : 'flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-left text-secondary hover:bg-muted'
                }
                onClick={() => onNavigate(item.key)}
                type="button"
              >
                <Icon className="size-5" />
                {item.label}
              </button>
              {item.children ? (
                <div className="ml-8 mt-1 grid gap-1 border-l pl-2">
                  {item.children.map((child) => {
                    const isChildActive = child.key === activeModule;
                    return (
                      <button
                        className={
                          isChildActive
                            ? 'rounded-md bg-primary/5 px-3 py-2 text-left text-sm font-medium text-primary'
                            : 'rounded-md px-3 py-2 text-left text-sm text-secondary hover:bg-muted'
                        }
                        key={child.key}
                        onClick={() => onNavigate(child.key)}
                        type="button"
                      >
                        {child.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
