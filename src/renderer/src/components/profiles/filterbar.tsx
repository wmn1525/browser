import { Bookmark, RefreshCw, Search, Settings, Trash2, X } from 'lucide-react';

import type { ProfileGroup } from '../../../../shared/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

interface FilterbarProps {
  readonly activeGroupId: string;
  readonly groups: readonly ProfileGroup[];
  readonly keyword: string;
  readonly onAction: (action: string) => void;
  readonly onClear: () => void;
  readonly onDeleteSelected: () => void;
  readonly onGroupChange: (groupId: string) => void;
  readonly onKeywordChange: (value: string) => void;
  readonly onRefresh: () => void;
  readonly onTagKeywordChange: (value: string) => void;
  readonly tagKeyword: string;
}

/** Profile 筛选栏，使用 Radix Select 保证下拉交互质量。 */
export function Filterbar({
  activeGroupId,
  groups,
  keyword,
  onAction,
  onClear,
  onDeleteSelected,
  onGroupChange,
  onKeywordChange,
  onRefresh,
  onTagKeywordChange,
  tagKeyword
}: FilterbarProps): JSX.Element {
  return (
    <section className="flex items-center gap-3 border-b bg-card px-6 py-3">
      <FilterSelect
        onValueChange={onGroupChange}
        options={[
          { label: '全部分组', value: 'all' },
          { label: '未分组', value: 'ungrouped' },
          ...groups.map((group) => ({ label: group.name, value: group.id }))
        ]}
        placeholder="全部分组"
        value={activeGroupId}
      />
      <div className="relative w-64">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" onChange={(event) => onKeywordChange(event.target.value)} placeholder="名称 | 备注 | 编号" value={keyword} />
      </div>
      <FilterSelect options={[{ label: '全部创建人', value: 'all' }, { label: 'admin', value: 'admin' }]} placeholder="请选择创建人" value="all" />
      <Input className="w-64" onChange={(event) => onTagKeywordChange(event.target.value)} placeholder="请选择标签 (可多选)" value={tagKeyword} />
      <div className="ml-auto flex gap-2">
        <Button onClick={onRefresh} size="icon" title="刷新" type="button" variant="outline"><RefreshCw className="size-4" /></Button>
        <Button onClick={onDeleteSelected} size="icon" title="删除" type="button" variant="outline"><Trash2 className="size-4" /></Button>
        <Button onClick={() => onAction('已加入收藏视图')} size="icon" title="收藏" type="button" variant="outline"><Bookmark className="size-4" /></Button>
        <Button onClick={() => onAction('表格列设置待接入')} size="icon" title="设置" type="button" variant="outline"><Settings className="size-4" /></Button>
        <Button onClick={onClear} size="icon" title="清空筛选" type="button" variant="outline"><X className="size-4" /></Button>
      </div>
    </section>
  );
}

function FilterSelect({ onValueChange, options, placeholder, value }: {
  readonly onValueChange?: (value: string) => void;
  readonly options: readonly { readonly label: string; readonly value: string }[];
  readonly placeholder: string;
  readonly value: string;
}): JSX.Element {
  return (
    <Select onValueChange={onValueChange} value={value}>
      <SelectTrigger className="w-48"><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}
