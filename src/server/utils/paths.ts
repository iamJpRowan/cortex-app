import { join } from 'path';
import { homedir } from 'os';

/**
 * Get OS-specific application data directory for storing user data
 * 
 * - macOS: ~/Library/Application Support/cortex
 * - Linux: ~/.local/share/cortex
 * - Windows: %APPDATA%\cortex
 */
export function getAppDataDir(): string {
  const platform = process.platform;
  const home = homedir();

  switch (platform) {
    case 'darwin': // macOS
      return join(home, 'Library', 'Application Support', 'cortex');
    case 'win32': // Windows
      return join(process.env.APPDATA || home, 'cortex');
    case 'linux': // Linux
      return join(home, '.local', 'share', 'cortex');
    default:
      // Fallback for other platforms
      return join(home, '.cortex');
  }
}

/**
 * Get the default conversations storage path
 */
export function getDefaultConversationsPath(): string {
  return join(getAppDataDir(), 'conversations');
}



