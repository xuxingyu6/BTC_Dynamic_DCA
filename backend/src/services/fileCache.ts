import fs from 'fs/promises';
import path from 'path';

/**
 * 极简文件缓存：避免高频调用免费数据源被限流。
 * 以 JSON 文件 + mtime 实现 TTL，写入采用临时文件 + rename 保证原子性。
 */
export class FileCache {
  private memory = new Map<string, { value: unknown; at: number }>();
  private diskWarned = false;

  constructor(private readonly dir: string) {}

  private fileFor(key: string): string {
    return path.join(this.dir, `${key.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`);
  }

  async get<T>(key: string, maxAgeMs: number): Promise<T | null> {
    const mem = this.memory.get(key);
    if (mem && Date.now() - mem.at <= maxAgeMs) return mem.value as T;
    try {
      const file = this.fileFor(key);
      const stat = await fs.stat(file);
      if (Date.now() - stat.mtimeMs > maxAgeMs) return null;
      const raw = await fs.readFile(file, 'utf8');
      const value = JSON.parse(raw) as T;
      this.memory.set(key, { value, at: Date.now() });
      return value;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.memory.set(key, { value, at: Date.now() });
    try {
      await fs.mkdir(this.dir, { recursive: true });
      const file = this.fileFor(key);
      const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(tmp, JSON.stringify(value), 'utf8');
      await fs.rename(tmp, file);
    } catch (err) {
      // Vercel 等只读文件系统下降级为纯内存缓存
      if (!this.diskWarned) {
        this.diskWarned = true;
        console.warn(
          `[cache] 磁盘缓存不可用（${this.dir}），改用内存缓存: ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }
  }

  async clear(prefix?: string): Promise<string[]> {
    for (const key of [...this.memory.keys()]) {
      if (!prefix || key.startsWith(prefix)) this.memory.delete(key);
    }
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
