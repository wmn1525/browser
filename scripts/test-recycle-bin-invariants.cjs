// 回收站与软删除的三条硬约束。
// 它们的共同点是：违反后代码照样跑、typecheck 照样过、单看那一处改动也很合理，
// 只有静态断言拦得住，所以单独成脚本。
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), 'utf8');

const mapper = read('src', 'core', 'profile-dto-mapper.ts');
const engine = read('src', 'core', 'browser-engine.ts');
const purge = read('src', 'core', 'profile-purge.ts');
const recycleBin = read('src', 'core', 'profile-recycle-bin.ts');
const failures = [];

/** 取出方法体：从签名起到第一处两空格缩进的闭合花括号。 */
function getMethodBody(source, signature) {
  const start = source.indexOf(signature);
  if (start === -1) {
    return undefined;
  }

  const end = source.indexOf('\n  }', start);
  return end === -1 ? undefined : source.slice(start, end);
}

// ---- 约束一：deletedAt 不能进 normalizeProfileDraft ----
// 核心库 update 是浅合并 {...existing, ...updates}，normalizeProfileDraft 返回字面量。
// 列出来的 key 即使值是 undefined 也会覆盖原值（再被 JSON.stringify 丢弃 = 删除）。
// ProfileDraft 上没有 deletedAt，一旦列进去，每次编辑都会抹掉回收站标记。
const normalizeBody = mapper.match(/export function normalizeProfileDraft[\s\S]*?\n}/)?.[0];
if (!normalizeBody) {
  failures.push('未找到 normalizeProfileDraft，断言失效，请更新本脚本。');
} else if (normalizeBody.includes('deletedAt')) {
  failures.push('normalizeProfileDraft 不得出现 deletedAt：它会在 update 浅合并时被覆盖成 undefined，等于每次编辑都清掉回收站标记。参照 chromiumDataDir 的处理方式。');
}

for (const typeName of ['ExtendedProfileConfig', 'ExtendedStoredProfile']) {
  const body = mapper.match(new RegExp(`interface ${typeName} extends [\\s\\S]*?\\n}`))?.[0];
  if (!body || !body.includes('deletedAt')) {
    failures.push(`${typeName} 必须声明 deletedAt，否则软删除标记无法透传。`);
  }
}

// 只看真实调用：该文件的注释里会提到这个函数名，解释的正是「为什么不用它」
if (/normalizeProfileDraft\(/.test(recycleBin)) {
  failures.push('profile-recycle-bin.ts 不得使用 normalizeProfileDraft：标记读写必须只提交 deletedAt 一个字段，否则会顺带重写其它配置。');
}

// ---- 约束二：三条彼此独立的读取路径都要过滤软删除 ----
// 它们看着像共用入口，实际各走各的：listWindowSyncProfiles 自己又调了一次
// profiles.list()，launchProfile 走的是核心库的 getByIdOrName（内部用库自己的 list）。
// 漏掉任意一条，回收站里的环境就会出现在窗口同步页，或仍能被 Open API 按 id / 按名字启动。
const filteredPaths = [
  ['public async listProfiles(', '主列表与 Open API 的唯一列表源'],
  ['public async listWindowSyncProfiles(', '窗口同步页，独立于 listProfiles 的第二条遍历'],
  ['public async launchProfile(', 'getByIdOrName 走核心库自己的 list，不受列表过滤影响']
];
for (const [signature, reason] of filteredPaths) {
  const body = getMethodBody(engine, signature);
  if (!body) {
    failures.push(`未找到 ${signature}，断言失效，请更新本脚本。`);
    continue;
  }

  if (!body.includes('isProfileDeleted')) {
    failures.push(`${signature.trim()} 必须用 isProfileDeleted 过滤软删除环境（${reason}）。`);
  }
}

// ---- 约束三：releaseChromiumProfileData 只能在失败重试路径里调用 ----
// 它会走 find-process + PowerShell Get-CimInstance 两路扫描，Promise.all 等满超时，
// 没命中时每次固定 2.5-3 秒，且是按 data 目录调的。
// 绝大多数情况下浏览器早已关闭、目录没被占用，无条件调用会让每次彻底删除都明显卡顿。
const callIndexes = [...purge.matchAll(/await releaseChromiumProfileData\(/g)].map((match) => match.index);
const firstCatchIndex = purge.indexOf('} catch (');
if (callIndexes.length === 0) {
  failures.push('profile-purge.ts 必须保留 releaseChromiumProfileData 的失败重试路径，否则目录被占用时删不掉。');
} else if (firstCatchIndex === -1 || callIndexes.some((index) => index < firstCatchIndex)) {
  failures.push('releaseChromiumProfileData 只能在 catch 分支里调用：它单次要 2.5-3 秒的进程扫描，无条件调用会让彻底删除卡顿。应先直接 rm，失败才结束占用进程后重试。');
}

if (!/try\s*\{[\s\S]*?await rm\(/.test(purge)) {
  failures.push('profile-purge.ts 必须先在 try 里直接 rm，把进程扫描留给失败路径。');
}

if (failures.length > 0) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log('recycle bin invariant checks passed.');
