import { Button, Divider, Tag } from 'antd';
import { ArrowRight, CheckCircle2, ExternalLink } from 'lucide-react';

import type { ProfileGroup, ProfileSummary } from '../../../../shared/types';
import { LocalGroupsPage } from './local-groups-page';
import { ManagedExtensionsPage } from './managed-extensions-page';
import { OpenApiPage } from './open-api-page';
import { ProxyPoolPage } from './proxy-pool-page';

export type ModuleKey = 'profiles' | 'groups' | 'proxies' | 'apps' | 'automation' | 'team';

export interface FeatureAction {
  readonly label: string;
  readonly message: string;
}

export interface FeatureCard {
  readonly title: string;
  readonly description: string;
  readonly steps: readonly string[];
  readonly actions: readonly FeatureAction[];
}

export interface FeaturePageConfig {
  readonly key: ModuleKey;
  readonly title: string;
  readonly summary: string;
  readonly docRefs: readonly string[];
  readonly cards: readonly FeatureCard[];
}

interface FeaturePageProps {
  readonly config: FeaturePageConfig;
  readonly groups?: readonly ProfileGroup[];
  readonly onAction: (message: string) => void;
  readonly onCreateGroup?: (name: string) => void;
  readonly onDeleteGroup?: (groupId: string) => void;
  readonly onOpenGroup?: (groupId: string) => void;
  readonly onRenameGroup?: (groupId: string, name: string) => void;
  readonly profiles?: readonly ProfileSummary[];
}

/** 参考主流指纹浏览器操作文档整理出的模块详情页。 */
export function FeaturePage({
  config,
  groups = [],
  onAction,
  onCreateGroup,
  onDeleteGroup,
  onOpenGroup,
  onRenameGroup,
  profiles = []
}: FeaturePageProps): JSX.Element {
  if (config.key === 'groups') {
    return (
      <LocalGroupsPage
        groups={groups}
        onCreateGroup={(name) => onCreateGroup?.(name)}
        onDeleteGroup={(groupId) => onDeleteGroup?.(groupId)}
        onOpenGroup={(groupId) => onOpenGroup?.(groupId)}
        onRenameGroup={(groupId, name) => onRenameGroup?.(groupId, name)}
        profiles={profiles}
      />
    );
  }

  if (config.key === 'proxies') {
    return <ProxyPoolPage />;
  }

  if (config.key === 'apps') {
    return <ManagedExtensionsPage />;
  }

  if (config.key === 'automation') {
    return <OpenApiPage />;
  }

  return (
    <section className="flex-1 overflow-auto p-6">
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <h2 className="text-2xl font-semibold">{config.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{config.summary}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {config.docRefs.map((ref) => <Tag key={ref}>{ref}</Tag>)}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {config.cards.map((card) => (
          <article className="rounded-lg border bg-card p-5 shadow-sm" key={card.title}>
            <div className="mb-4">
              <h3 className="text-base font-semibold">{card.title}</h3>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{card.description}</p>
            </div>

            <div className="grid gap-2">
              {card.steps.map((step) => (
                <div className="flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm" key={step}>
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{step}</span>
                </div>
              ))}
            </div>

            <Divider className="my-4" />

            <div className="flex flex-wrap gap-2">
              {card.actions.map((action) => (
                <Button htmlType="button" key={action.label} onClick={() => onAction(action.message)} size="small">
                  {action.label}
                  {action.label.includes('文档') ? <ExternalLink className="size-3.5" /> : <ArrowRight className="size-3.5" />}
                </Button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
