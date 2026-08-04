import { Select } from 'antd';
import { useState } from 'react';

interface ProfileTagsFieldProps {
  readonly initialTags: readonly string[];
  readonly tagOptions: readonly string[];
}

/** 去掉空白与重复，隐藏字段按标签逐个渲染，重复值会让 React key 冲突。 */
function normalizeTags(tags: readonly string[]): readonly string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
}

/**
 * 标签输入行。antd Select 是受控组件不会进 FormData，
 * 因此用同名隐藏字段逐个承载，配合 form.getAll('tags') 读取；
 * 相比逗号拼接，标签内部含逗号也不会被切开。
 */
export function ProfileTagsField({ initialTags, tagOptions }: ProfileTagsFieldProps): JSX.Element {
  const [tags, setTags] = useState<readonly string[]>(() => normalizeTags(initialTags));

  return (
    <label className="grid grid-cols-[128px_1fr] items-start gap-3">
      <span className="pt-1 text-sm text-secondary">标签</span>
      <div>
        {tags.map((tag) => <input key={tag} name="tags" type="hidden" value={tag} />)}
        <Select
          className="w-full"
          mode="tags"
          onChange={(value: string[]) => setTags(normalizeTags(value))}
          options={tagOptions.map((tag) => ({ label: tag, value: tag }))}
          placeholder="选择已有标签，或输入新标签后回车"
          value={[...tags]}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">下拉里是其它环境用过的标签，优先复用可避免出现大小写或空格变体。</p>
      </div>
    </label>
  );
}
