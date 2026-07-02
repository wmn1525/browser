import type { PropsWithChildren } from 'react';

import { Button } from './components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from './components/ui/dialog';
import { Textarea } from './components/ui/textarea';

export interface FeaturePanel {
  readonly title: string;
  readonly description: string;
  readonly items: readonly string[];
}

/** 功能入口反馈弹窗，用于承接尚未进入专页的本地操作说明。 */
export function FeatureDialog({ onClose, panel }: {
  readonly onClose: () => void;
  readonly panel: FeaturePanel | undefined;
}): JSX.Element {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onClose(); }} open={Boolean(panel)}>
      <DialogContent>
        <DialogTitle>{panel?.title}</DialogTitle>
        <DialogDescription>{panel?.description}</DialogDescription>
        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <ul className="grid gap-2 text-sm">
            {(panel?.items ?? []).map((item) => <li className="rounded-md bg-card px-3 py-2" key={item}>{item}</li>)}
          </ul>
        </div>
        <DialogFooter><Button type="button">完成</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** JSON 导出和详情预览弹窗，避免根组件承载展示细节。 */
export function PreviewDialog({ onOpenChange, text, title }: {
  readonly onOpenChange: () => void;
  readonly text: string;
  readonly title: string;
}): JSX.Element {
  return (
    <Dialog onOpenChange={(open) => { if (!open) onOpenChange(); }} open={text.length > 0}>
      <DialogContent className="w-[min(760px,calc(100vw-48px))]">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>内容已生成，可检查后复制或保存。</DialogDescription>
        <Textarea className="mt-4 min-h-80 font-mono text-xs" readOnly value={text} />
        <DialogFooter><Button type="button">关闭</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DialogFooter({ children }: PropsWithChildren): JSX.Element {
  return <div className="mt-4 flex justify-end"><DialogClose asChild>{children}</DialogClose></div>;
}
