import type { FormEvent } from 'react';

import { Button } from '../ui/button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import type { ProxyPoolItem } from './proxy-pool-types';

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
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="w-[min(680px,calc(100vw-48px))]">
        <DialogTitle>{editingProxy ? '编辑代理' : '新增导入'}</DialogTitle>
        <DialogDescription>支持 HTTP、HTTPS、SOCKS5。</DialogDescription>
        {editingProxy ? null : (
          <div className="mt-4 flex gap-2">
            <Button onClick={() => onModeChange('batch')} type="button" variant={mode === 'batch' ? 'default' : 'outline'}>批量导入</Button>
            <Button onClick={() => onModeChange('single')} type="button" variant={mode === 'single' ? 'default' : 'outline'}>单个新增</Button>
          </div>
        )}
        {mode === 'batch' && !editingProxy ? (
          <div className="mt-4">
            <Textarea
              className="min-h-48 font-mono text-xs"
              onChange={(event) => onImportTextChange(event.target.value)}
              placeholder="http://user:pass@host:port&#10;host:port:user:pass"
              value={importText}
            />
            <div className="mt-4 flex justify-end gap-2">
              <DialogClose asChild><Button type="button" variant="outline">取消</Button></DialogClose>
              <Button onClick={onBatchSubmit} type="button">导入</Button>
            </div>
          </div>
        ) : (
          <form className="mt-4 grid gap-3" key={editingProxy?.id ?? 'new-proxy'} onSubmit={onSingleSubmit}>
            <ProxyFormFields editingProxy={editingProxy} />
            <div className="flex justify-end gap-2">
              <DialogClose asChild><Button type="button" variant="outline">取消</Button></DialogClose>
              <Button type="submit">保存</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ProxyFormFields({ editingProxy }: { readonly editingProxy?: ProxyPoolItem }): JSX.Element {
  return (
    <>
      <div className="grid grid-cols-[120px_1fr] items-center gap-3">
        <label className="text-right text-sm text-muted-foreground">代理类型</label>
        <select className="h-9 rounded-lg border-0 bg-muted px-3 text-sm outline-none" defaultValue={editingProxy?.protocol ?? 'http'} name="protocol">
          <option value="http">HTTP</option>
          <option value="https">HTTPS</option>
          <option value="socks5">SOCKS5</option>
        </select>
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
