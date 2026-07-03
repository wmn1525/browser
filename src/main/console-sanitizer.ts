type ConsoleMethod = 'log' | 'info' | 'warn' | 'error';

const replacements: readonly [RegExp, string][] = [
  [/🚀|馃殌/g, '[launch]'],
  [/📁|馃搧/g, '[data]'],
  [/✅|鉁\??/g, '[ok]'],
  [/❌|鉂\??/g, '[error]'],
  [/🧹|馃Ч/g, '[clean]'],
  [/🌍|馃寧/g, '[geo]'],
  [/♻️?|鈾伙笍/g, '[reuse]']
];

/** 安装主进程日志清洗，避免依赖输出 emoji 时在 Windows 控制台显示成乱码。 */
export function installConsoleSanitizer(): void {
  for (const method of ['log', 'info', 'warn', 'error'] satisfies readonly ConsoleMethod[]) {
    const original = console[method].bind(console);
    console[method] = (...values: readonly unknown[]) => {
      original(...values.map(sanitizeLogValue));
    };
  }
}

function sanitizeLogValue(value: unknown): unknown {
  return typeof value === 'string' ? sanitizeText(value) : value;
}

function sanitizeText(value: string): string {
  return replacements.reduce((text, [pattern, replacement]) => text.replace(pattern, replacement), value);
}
