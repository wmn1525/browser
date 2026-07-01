import { AppWindow, Bolt, CloudCog, Folder, Globe2, Grid2X2, Plus, Users } from 'lucide-react';

import type { ModuleKey } from '../feature/feature-page';
import { Button } from '../ui/button';

interface SidebarProps {
  readonly activeModule: ModuleKey;
  readonly onNavigate: (module: ModuleKey) => void;
  readonly onCreateProfile: () => void;
}

const navItems = [
  { key: 'profiles', label: '环境管理', icon: Grid2X2 },
  { key: 'groups', label: '分组管理', icon: Folder },
  { key: 'proxies', label: '代理管理', icon: Globe2 },
  { key: 'apps', label: '应用中心', icon: AppWindow },
  { key: 'automation', label: '自动化', icon: Bolt },
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
        <p className="mt-1 text-[10px] uppercase text-muted-foreground">v 0.1.8</p>
      </div>

      <Button className="mb-4 w-full" onClick={onCreateProfile} type="button">
        <Plus className="size-4" />
        新建浏览器
      </Button>

      <nav className="grid gap-1">
        {navItems.map((item, index) => {
          const Icon = item.icon;
          const isTeamBlock = index === 4;
          const isActive = item.key === activeModule;
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
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
