import { Maximize2, Minus, X } from 'lucide-react';

import { Button } from '../ui/button';

/** 无边框 Electron 窗口的自定义标题栏。 */
export function WindowTitlebar(): JSX.Element {
  return (
    <header className="drag-region relative flex h-[34px] items-center justify-center border-b bg-card">
      <div className="font-semibold">Im-Run Browser</div>
      <div className="no-drag absolute right-0 top-0 flex h-full">
        <Button
          className="h-full w-[46px] rounded-none"
          onClick={() => void window.browserShell.minimizeWindow()}
          title="最小化"
          type="button"
          variant="ghost"
        >
          <Minus className="size-4" />
        </Button>
        <Button
          className="h-full w-[46px] rounded-none"
          onClick={() => void window.browserShell.toggleMaximizeWindow()}
          title="全屏"
          type="button"
          variant="ghost"
        >
          <Maximize2 className="size-4" />
        </Button>
        <Button
          className="h-full w-[46px] rounded-none hover:bg-[#e81123] hover:text-white"
          onClick={() => void window.browserShell.closeWindow()}
          title="关闭"
          type="button"
          variant="ghost"
        >
          <X className="size-4" />
        </Button>
      </div>
    </header>
  );
}
