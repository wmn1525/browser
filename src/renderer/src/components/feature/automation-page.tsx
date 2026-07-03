import { OpenApiPage } from './open-api-page';
import { WindowSyncPage } from './window-sync-page';

export type AutomationTab = 'api-mcp' | 'window-sync';

interface AutomationPageProps {
  readonly activeTab: AutomationTab;
}

/** 自动化模块二级页容器，统一承载 API&MCP 和窗口同步。 */
export function AutomationPage({ activeTab }: AutomationPageProps): JSX.Element {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
      {activeTab === 'api-mcp' ? <OpenApiPage /> : <WindowSyncPage />}
    </section>
  );
}
