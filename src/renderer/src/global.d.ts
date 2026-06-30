import type { BrowserShellApi } from '../../shared/types';

declare global {
  interface Window {
    readonly browserShell: BrowserShellApi;
  }
}

export {};
