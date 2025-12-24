import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { AppConfig } from '../../shared/types/Config.js';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

export class Logger {
  private config: AppConfig['logging'];
  private logPath: string;
  private logFile: string;

  constructor(config: AppConfig['logging']) {
    this.config = config;
    this.logPath = path.resolve(config.outputPath);
    this.logFile = path.join(this.logPath, `cortex-${new Date().toISOString().split('T')[0]}.log`);
    this.ensureLogDirectory();
  }

  private async ensureLogDirectory(): Promise<void> {
    if (!existsSync(this.logPath)) {
      await mkdir(this.logPath, { recursive: true });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.level);
    const messageLevel = levels.indexOf(level);
    return messageLevel >= configLevel;
  }

  private formatMessage(entry: LogEntry): string {
    const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
    return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}\n`;
  }

  private async writeLog(entry: LogEntry): Promise<void> {
    if (!this.shouldLog(entry.level)) {
      return;
    }

    const formatted = this.formatMessage(entry);

    if (this.config.enableConsoleLogging) {
      const consoleMethod = entry.level === 'error' ? 'error' : 
                           entry.level === 'warn' ? 'warn' : 
                           entry.level === 'info' ? 'info' : 'log';
      console[consoleMethod](formatted.trim());
    }

    if (this.config.enableFileLogging) {
      try {
        await writeFile(this.logFile, formatted, { flag: 'a' });
      } catch (error) {
        console.error('Failed to write log file:', error);
      }
    }
  }

  async debug(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'debug',
      message,
      context,
    });
  }

  async info(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'info',
      message,
      context,
    });
  }

  async warn(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'warn',
      message,
      context,
    });
  }

  async error(message: string, context?: Record<string, unknown>): Promise<void> {
    await this.writeLog({
      timestamp: new Date().toISOString(),
      level: 'error',
      message,
      context,
    });
  }
}

