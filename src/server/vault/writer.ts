import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';
import { VaultReader } from './reader.js';

export class VaultWriter {
  private vaultPath: string;
  private logger: Logger;
  private reader: VaultReader;

  constructor(config: AppConfig['vault'], logger: Logger) {
    this.vaultPath = config.path;
    this.logger = logger;
    this.reader = new VaultReader(config, logger);
  }

  async writeFile(
    filePath: string,
    content: string,
    options?: { preserveFrontmatter?: boolean }
  ): Promise<void> {
    const fullPath = path.join(this.vaultPath, filePath);

    try {
      // Ensure directory exists
      const dir = path.dirname(fullPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      // If preserving frontmatter, read existing file first
      let finalContent = content;
      if (options?.preserveFrontmatter) {
        try {
          const existing = await this.reader.readFile(filePath);
          if (existing.metadata?.frontmatter) {
            const frontmatterStr = this.formatFrontmatter(existing.metadata.frontmatter);
            finalContent = `---\n${frontmatterStr}---\n\n${content}`;
          }
        } catch {
          // File doesn't exist, write new content as-is
        }
      }

      await writeFile(fullPath, finalContent, 'utf-8');
      await this.logger.info('File written', { filePath, size: finalContent.length });
    } catch (error) {
      await this.logger.error('Failed to write file', { filePath, error });
      throw error;
    }
  }

  async updateFile(
    filePath: string,
    updater: (content: string) => string
  ): Promise<void> {
    try {
      const existing = await this.reader.readFile(filePath);
      const updated = updater(existing.content);

      // Preserve frontmatter if it exists
      let finalContent = updated;
      if (existing.metadata?.frontmatter) {
        const frontmatterStr = this.formatFrontmatter(existing.metadata.frontmatter);
        finalContent = `---\n${frontmatterStr}---\n\n${updated}`;
      }

      await this.writeFile(filePath, finalContent, { preserveFrontmatter: false });
    } catch (error) {
      await this.logger.error('Failed to update file', { filePath, error });
      throw error;
    }
  }

  private formatFrontmatter(frontmatter: Record<string, unknown>): string {
    const lines: string[] = [];
    for (const [key, value] of Object.entries(frontmatter)) {
      lines.push(`${key}: ${value}`);
    }
    return lines.join('\n') + '\n';
  }
}

