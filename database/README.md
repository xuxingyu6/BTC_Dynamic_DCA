# Database

项目默认使用 **零配置的文件存储模式**（`DATABASE_MODE=file`），开箱即用。
如需启用 PostgreSQL + Prisma：

```bash
# 1. 启动 PostgreSQL
npm run db:up

# 2. 复制 .env 并切换存储模式
copy ..\.env.example ..\.env
# 编辑 .env: DATABASE_MODE=postgres

# 3. 生成 Prisma Client 并执行迁移
npm run db:generate
npm run db:migrate

# 4. 启动后端
npm run dev:backend
```

> 说明：`init.sql` 中的 `CREATE USER/DATABASE IF NOT EXISTS` 仅用于 PostgreSQL 16 的
> docker-entrypoint-initdb.d 场景。若使用已存在的 Postgres 实例，请手工创建
> `btc_dca` 用户与数据库，或将 `DATABASE_URL` 指向已有库。
