import type { BrowserShellApi } from '../../shared/types';

declare global {
  const __APP_VERSION__: string;

  interface Window {
    readonly browserShell: BrowserShellApi;
  }
}

export {};
