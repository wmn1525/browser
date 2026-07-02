import { Button, Input, Modal, Select } from 'antd';
import type { FormEvent } from 'react';
import { useState } from 'react';

import type { ProxyPoolItem } from './proxy-pool-types';

const { TextArea } = Input;

interface ProxyImportDialogProps {
  readonly editingProxy?: ProxyPoolItem;
  readonly importText: string;
  readonly mode: 'single' | 'batch';
  readonly onBatchSubmit: () => void;
  readonly onImportTextChange: (text: string) => void;
  readonly onModeChange: (mode: 'single' | 'batch') => void;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSingleSubmit: (event: FormEvent<HTMLFormElement>) => void;
  readonly open: boolean;
}

/** 代理池的新增和批量导入弹窗。 */
export function ProxyImportDialog({
  editingProxy,
  importText,
  mode,
  onBatchSubmit,
  onImportTextChange,
  onModeChange,
  onOpenChange,
  onSingleSubmit,
  open
}: ProxyImportDialogProps): JSX.Element {
  return (
    <Modal footer={null} onCancel={() => onOpenChange(false)} open={open} title={editingProxy ? '编辑代理' : '新增导入'} width={680}>
        <p className="text-sm text-muted-foreground">支持 HTTP、HTTPS、SOCKS5。</p>
        {editingProxy ? null : (
          <div className="mt-4 flex gap-2">
            <Button htmlType="button" onClick={() => onModeChange('batch')} type={mode === 'batch' ? 'primary' : 'default'}>批量导入</Button>
            <Button htmlType="button" onClick={() => onModeChange('single')} type={mode === 'single' ? 'primary' : 'default'}>单个新增</Button>
          </div>
        )}
        {mode === 'batch' && !editingProxy ? (
          <div className="mt-4">
            <TextArea
              className="min-h-48 font-mono text-xs"
              onChange={(event) => onImportTextChange(event.target.value)}
              placeholder="http://user:pass@host:port&#10;host:port:user:pass"
              value={importText}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button htmlType="button" onClick={() => onOpenChange(false)}>取消</Button>
              <Button htmlType="button" onClick={onBatchSubmit} type="primary">导入</Button>
            </div>
          </div>
        ) : (
          <form className="mt-4 grid gap-3" key={editingProxy?.id ?? 'new-proxy'} onSubmit={onSingleSubmit}>
            <ProxyFormFields editingProxy={editingProxy} />
            <div className="flex justify-end gap-2">
              <Button htmlType="button" onClick={() => onOpenChange(false)}>取消</Button>
              <Button htmlType="submit" type="primary">保存</Button>
            </div>
          </form>
        )}
    </Modal>
  );
}

function ProxyFormFields({ editingProxy }: { readonly editingProxy?: ProxyPoolItem }): JSX.Element {
  const [protocol, setProtocol] = useState(editingProxy?.protocol ?? 'http');

  return (
    <>
      <div className="grid grid-cols-[120px_1fr] items-center gap-3">
        <label className="text-right text-sm text-muted-foreground">代理类型</label>
        <input name="protocol" type="hidden" value={protocol} />
        <Select
          onChange={setProtocol}
          options={[
            { label: 'HTTP', value: 'http' },
            { label: 'HTTPS', value: 'https' },
            { label: 'SOCKS5', value: 'socks5' }
          ]}
          value={protocol}
        />
      </div>
      <FormInput defaultValue={editingProxy?.host} label="代理地址" name="host" placeholder="proxy.example.com" />
      <FormInput defaultValue={editingProxy?.port} label="端口号" name="port" placeholder="8080" />
      <FormInput defaultValue={editingProxy?.username} label="代理账号" name="username" />
      <FormInput defaultValue={editingProxy?.password} label="代理密码" name="password" type="password" />
      <FormInput defaultValue={editingProxy?.remark} label="备注" name="remark" placeholder="账号组 A" />
      <FormInput defaultValue={editingProxy?.tags.join(',')} label="标签" name="tags" placeholder="US,运营" />
    </>
  );
}

function FormInput({ defaultValue, label, name, placeholder, type = 'text' }: {
  readonly defaultValue?: number | string;
  readonly label: string;
  readonly name: string;
  readonly placeholder?: string;
  readonly type?: string;
}): JSX.Element {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3">
      <label className="text-right text-sm text-muted-foreground">{label}</label>
      <Input defaultValue={defaultValue} name={name} placeholder={placeholder} type={type} />
    </div>
  );
}
