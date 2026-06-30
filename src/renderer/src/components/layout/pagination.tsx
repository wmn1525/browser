import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';

/** 底部分页与状态栏。 */
export function Pagination({ count, status }: { readonly count: number; readonly status: string }): JSX.Element {
  return (
    <section className="flex items-center justify-between border-t bg-card px-6 py-3 text-xs text-secondary">
      <div className="flex items-center gap-3">
        <span>共 {count} 条</span>
        <Select defaultValue="10">
          <SelectTrigger className="h-7 w-24"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="10">10条/页</SelectItem><SelectItem value="20">20条/页</SelectItem></SelectContent>
        </Select>
        <Button className="h-7 w-7" disabled size="icon" type="button" variant="ghost">‹</Button>
        <Button className="h-7 w-7" size="icon" type="button">1</Button>
        <Button className="h-7 w-7" disabled size="icon" type="button" variant="ghost">›</Button>
        <span>前往</span>
        <Input className="h-7 w-9 px-1 text-center" readOnly value="1" />
      </div>
      <span>{status}</span>
    </section>
  );
}
