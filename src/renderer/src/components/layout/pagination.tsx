import { Button, Input, Select } from 'antd';

/** 底部分页与状态栏。 */
export function Pagination({ count, status }: { readonly count: number; readonly status: string }): JSX.Element {
  return (
    <section className="flex items-center justify-between border-t bg-card px-6 py-3 text-xs text-secondary">
      <div className="flex items-center gap-3">
        <span>共 {count} 条</span>
        <Select className="w-24" defaultValue="10" options={[{ label: '10条/页', value: '10' }, { label: '20条/页', value: '20' }]} size="small" />
        <Button className="h-7 w-7" disabled htmlType="button" size="small" type="text">‹</Button>
        <Button className="h-7 w-7" htmlType="button" size="small" type="primary">1</Button>
        <Button className="h-7 w-7" disabled htmlType="button" size="small" type="text">›</Button>
        <span>前往</span>
        <Input className="h-7 w-9 px-1 text-center" readOnly size="small" value="1" />
      </div>
      <span>{status}</span>
    </section>
  );
}
