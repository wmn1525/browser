import { Button, Input, Modal } from 'antd';
import type { PropsWithChildren } from 'react';

const { TextArea } = Input;

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
    <Modal footer={null} onCancel={onClose} open={Boolean(panel)} title={panel?.title}>
        <p className="text-sm text-muted-foreground">{panel?.description}</p>
        <div className="mt-4 rounded-lg border bg-muted/40 p-4">
          <ul className="grid gap-2 text-sm">
            {(panel?.items ?? []).map((item) => <li className="rounded-md bg-card px-3 py-2" key={item}>{item}</li>)}
          </ul>
        </div>
        <DialogFooter><Button htmlType="button" onClick={onClose} type="primary">完成</Button></DialogFooter>
    </Modal>
  );
}

/** JSON 导出和详情预览弹窗，避免根组件承载展示细节。 */
export function PreviewDialog({ onOpenChange, text, title }: {
  readonly onOpenChange: () => void;
  readonly text: string;
  readonly title: string;
}): JSX.Element {
  return (
    <Modal footer={null} onCancel={onOpenChange} open={text.length > 0} title={title} width={760}>
        <p className="text-sm text-muted-foreground">内容已生成，可检查后复制或保存。</p>
        <TextArea className="mt-4 min-h-80 font-mono text-xs" readOnly value={text} />
        <DialogFooter><Button htmlType="button" onClick={onOpenChange} type="primary">关闭</Button></DialogFooter>
    </Modal>
  );
}

function DialogFooter({ children }: PropsWithChildren): JSX.Element {
  return <div className="mt-4 flex justify-end">{children}</div>;
}
