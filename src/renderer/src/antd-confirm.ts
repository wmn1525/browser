import { Modal } from 'antd';

interface ConfirmOptions {
  readonly title: string;
  readonly content: string;
  readonly okText: string;
  readonly danger?: boolean;
}

/** 用 AntD 静态确认框包装成 Promise，避免业务代码混用原生 confirm。 */
export function confirmWithAntd(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    Modal.confirm({
      cancelText: '取消',
      centered: true,
      content: options.content,
      okButtonProps: options.danger ? { danger: true } : undefined,
      okText: options.okText,
      title: options.title,
      onCancel: () => resolve(false),
      onOk: () => resolve(true)
    });
  });
}

/** 删除类操作统一使用危险按钮，保持确认弹窗文案和视觉一致。 */
export function confirmDelete(title: string, content: string): Promise<boolean> {
  return confirmWithAntd({ content, danger: true, okText: '确认删除', title });
}
