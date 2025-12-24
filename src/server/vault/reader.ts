import { readFile, readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { AppConfig } from '../../shared/types/Config.js';
import { Logger } from '../logging/Logger.js';

export interface VaultFile {
  path: string;
  content: string;
  metadata?: {
    frontmatter?: Record<string, unknown>;
    lastModified?: Date;
  };
}

export class VaultReader {
  private vaultPath: string;
  private logger: Logger;

  constructor(config: AppConfig['vault'], logger: Logger) {
    this.vaultPath = config.path;
    this.logger = logger;
  }

  async readFile(filePath: string): Promise<VaultFile> {
    const fullPath = path.join(this.vaultPath, filePath);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    try {
      const content = await readFile(fullPath, 'utf-8');
      const stats = await stat(fullPath);

      await this.logger.info('File read', { filePath, size: content.length });

      // Parse frontmatter if present
      const { frontmatter, body } = this.parseFrontmatter(content);

      return {
        path: filePath,
        content: body,
        metadata: {
          frontmatter,
          lastModified: stats.mtime,
        },
      };
    } catch (error) {
      await this.logger.error('Failed to read file', { filePath, error });
      throw error;
    }
  }

  async listFiles(directory: string = '', extension?: string): Promise<string[]> {
    const fullPath = path.join(this.vaultPath, directory);

    if (!existsSync(fullPath)) {
      return [];
    }

    try {
      const entries = await readdir(fullPath, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        const entryPath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(entryPath, extension);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          if (!extension || entry.name.endsWith(extension)) {
            files.push(entryPath);
          }
        }
      }

      return files;
    } catch (error) {
      await this.logger.error('Failed to list files', { directory, error });
      throw error;
    }
  }

  private parseFrontmatter(content: string): { frontmatter?: Record<string, unknown>; body: string } {
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { body: content };
    }

    try {
      const frontmatterText = match[1];
      const body = match[2];

      if (!frontmatterText || !body) {
        return { body: content };
      }

      // Simple YAML parsing (basic key-value pairs)
      const frontmatter: Record<string, unknown> = {};
      const lines = frontmatterText.split('\n');

      for (const line of lines) {
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.slice(0, colonIndex).trim();
          const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
          frontmatter[key] = value;
        }
      }

      return { frontmatter, body };
    } catch (error) {
      // If parsing fails, return content as-is
      return { body: content };
    }
  }
}

