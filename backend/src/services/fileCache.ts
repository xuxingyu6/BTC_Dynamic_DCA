import fs from 'fs/promises';
import path from 'path';

/**
 * 极简文件缓存：避免高频调用免费数据源被限流。
 * 以 JSON 文件 + mtime 实现 TTL，写入采用临时文件 + rename 保证原子性。
 */
export class FileCache {
  constructor(private readonly dir: string) {}

  private fileFor(key: string): string {
    return path.join(this.dir, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  }

  async get<T>(key: string, maxAgeMs: number): Promise<T | null> {
    try {
      const file = this.fileFor(key);
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
      const raw = await fs.readFile(file, 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    await fs.mkdir(this.dir, { recursive: true });
    const file = this.fileFor(key);
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(value), 'utf8');
    await fs.rename(tmp, file);
  }

  async clear(prefix?: string): Promise<string[]> {
    const removed: string[] = [];
    try {
      const files = await fs.readdir(this.dir);
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        if (prefix && !f.startsWith(prefix)) continue;
        await fs.rm(path.join(this.dir, f), { force: true });
        removed.push(f);
      }
    } catch {
      /* dir may not exist */
    }
    return removed;
  }
}
