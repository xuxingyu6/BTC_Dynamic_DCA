# BTC 动态混合定投 · Dynamic DCA Dashboard

面向长期 BTC 投资者的动态定投策略分析平台（投资智能驾驶舱）。

核心思路：不预测顶部与底部，而是通过 **200 周移动平均线 / MVRV / Puell Multiple** 三个周期指标判断市场是否进入低估区域，在恐慌与低估时自动提高定投金额，提升长期资金利用效率。

![Tech Stack](https://img.shields.io/badge/React-19-61dafb) ![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6) ![Vite](https://img.shields.io/badge/Vite-7-646cff) ![Express](https://img.shields.io/badge/Express-5-000000) ![Prisma](https://img.shields.io/badge/Prisma-6-2d3748)

---

## 功能总览

| 模块 | 说明 |
| --- | --- |
| 📊 Dashboard | BTC 实时价格 / 24h 涨跌 / ATH / 距离 ATH 跌幅、三指标卡片（触发状态）、动态定投结果面板（评分 / 加仓金额）、价格 + 200W MA 走势图 |
| 🧪 回测模拟 | 对比「普通 DCA」与「动态 DCA」：总投入、BTC 累计、平均成本、收益率、CAGR、最大回撤；价格买入点图 + 账户净值对比图 |
| 📒 投资记录 | 记录真实投资（日期 / 价格 / 金额 / 数量 / 市场状态 / 备注），自动汇总持仓成本与浮动收益 |
| ⚡ 加速资金管理 | 每月预算自动拆分为 Core DCA（底仓，每日买入）与 Acceleration Reserve（加速资金，恐慌时按风险等级分批释放）；Risk Meter 实时展示等级与释放金额；月度释放上限防止快速耗尽 |
| ⚙️ 参数设置 | 基础定投金额、L1/L2/L3 加仓金额、定投频率、手续费率、三指标阈值、资金分配比例、加速释放规则、数据源模式、MVRV/Puell 手动覆盖 |
| 🎨 主题 | 浅色 / 深色 / 跟随系统自由切换（顶栏一键切换，选择保存在本地） |

## 动态定投算法

```text
触发条件：
  指标 1  价格 <= 200W MA × 倍数（默认 1.1）
  指标 2  MVRV < 阈值（默认 1.0，极端 < 0.8）
  指标 3  Puell < 阈值（默认 0.6，极端 < 0.5）

满足数量    市场状态        本次投入
  0         正常区间        基础金额
  1         轻度低估        基础 + L1（默认 +$500）
  2         明显低估        基础 + L2（默认 +$1000）
  3         极端低估        基础 + L3（默认 +$1500）
```

所有金额与阈值均为用户可配置参数，不写死。

## 加速资金管理（Acceleration Reserve）

将每月投资预算自动拆分：

```text
每月预算 $1000
├── Core DCA 40% = $400        → 每日 $13.33 自动买入（不受市场影响，保证不踏空）
└── Acceleration Reserve 60% = $600 → 留存为 Waiting Cash，等待低估机会
```

加速资金根据三指标触发数量计算 Risk Level 并分批释放：

| Level | 触发指标 | 市场状态 | 释放比例（默认） |
| --- | --- | --- | --- |
| 0 | 0 个 | 正常区域 | 0%（不释放，Core 继续每日买入） |
| 1 | 1 个 | 轻度低估 | 10% |
| 2 | 2 个 | 明显低估 | 30% |
| 3 | 3 个 | 极端低估 | 60% |

实际释放金额受两个上限约束：

1. **剩余余额**：实际释放 = min(等级比例金额, 剩余余额, 本月剩余额度)
2. **Monthly Deployment Limit**（默认 100%）：每月最多释放 初始资金池 × 上限比例，防止连续触发导致资金快速耗尽；跨月自动重置本月计数

释放时自动生成 **Acceleration Buy** 交易记录（日期 / 价格 / Risk Level / 触发指标数 / 释放金额 / 释放后余额），并在 Dashboard 展示资金池状态（Initial / Used / Remaining / Monthly Deployment），状态分为 🟢 Available / 🟡 Partially Used / 🔴 Exhausted。

## 技术架构

```text
┌─────────────────────────────┐        ┌──────────────────────────────┐
│  frontend (React + TS)      │  /api  │  backend (Express + TS)      │
│  Vite · TailwindCSS 4        │ ─────▶ │                              │
│  Recharts 3 · React Router 7 │        │  Indicator Engine            │
│  Dashboard / Simulator /     │        │   ├─ MA200W Indicator        │
│  Records / Settings          │        │   ├─ MVRV Indicator          │
└─────────────────────────────┘        │   └─ Puell Indicator         │
│  Strategy Engine              │
│  Acceleration Reserve Engine  │
│   ├─ RiskLevelEngine          │
│   ├─ CapitalAllocationEngine  │
│   └─ Reserve State Store      │
│  Backtest Engine              │
                                       │  Market Data Service          │
                                       │   ├─ CoinGecko（快照）         │
                                       │   ├─ CoinMetrics（历史日线）    │
                                       │   ├─ Bitbo（可选，真实指标）    │
                                       │   └─ Demo 生成器（离线兜底）    │
                                       │  Records（Prisma / 文件仓储）   │
                                       └──────────────────────────────┘
```

### 数据链路与来源

| 数据 | 来源 | 说明 |
| --- | --- | --- |
| BTC 当前价格 / 24h / ATH / 市值 | CoinGecko | 免费 API，失败时自动用 CoinMetrics 历史日线兜底 |
| 历史日线（2013 至今） | CoinMetrics Community API | 免费，无需 Key |
| 200W MA | 由历史日线按周聚合计算 | 仅使用已完成周，无未来函数 |
| Puell Multiple | CoinMetrics `IssTotUSD`（矿工日发行收入）/ 365 日均值 | 真实收入数据，免费 |
| MVRV | 默认模型估算（已实现价格 ≈ 1200 日 EMA）；配置 `BITBO_API_KEY` 后使用 Bitbo 真实 MVRV | UI 会明确标注「估算」 |
| MVRV / Puell / 200W MA（可选权威源） | Bitbo API（`charts.bitbo.io/api/v1`） | 需 Bitbo Pro++ 账户 Key，见下文 |

> 说明：Bitbo 网页本身有 Cloudflare 人机验证、API 需要 Pro++ 账户，因此默认不依赖 Bitbo；
> 在 `.env` 中配置 `BITBO_API_KEY` 后自动启用真实指标覆盖，MVRV / Puell / MA200W 三个指标均切换到 Bitbo 数据。

### 数据降级策略

1. 优先实时数据（CoinGecko + CoinMetrics）；
2. 实时数据不可用时自动降级为**演示数据**（基于真实历史锚点插值的确定性模拟，UI 标注「演示」）；
3. MVRV 在无链上数据时使用模型估算（UI 标注「估算」），也可在设置页手动覆盖，用于情景模拟。

## 快速开始

环境要求：Node.js ≥ 20、npm ≥ 10（可选：Docker 用于 PostgreSQL）

```bash
# 1. 安装依赖
npm install

# 2. 启动前后端（backend :4000，frontend :5173）
npm run dev

# 打开 http://localhost:5173
```

生产模式：

```bash
npm run build
npm start          # 后端 :4000（前端产物在 frontend/dist，可用任意静态服务器托管）
```

## 数据库

默认使用**零配置文件存储**（`DATABASE_MODE=file`，记录保存在 `backend/data/records.json`）。

启用 PostgreSQL + Prisma：

```bash
cp .env.example .env      # 编辑 DATABASE_MODE=postgres
npm run db:up             # docker compose 启动 PostgreSQL 16
npm run db:generate       # 生成 Prisma Client
npm run db:migrate        # 执行迁移
npm run dev:backend
```

仓储层（`backend/src/db/recordsRepository.ts`）采用接口模式：PostgreSQL 不可用时会自动回退到文件存储，不影响其它功能。

## API 参考

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 + 当前数据源状态 |
| GET | `/api/btc-price` | 价格快照：price / change24h / ATH / 市值 |
| GET | `/api/200w-ma` | 200W MA：值 / 距离 / 是否触发 |
| GET | `/api/mvrv` | MVRV：值 / 区域 / 是否触发 / 近 180 日序列 |
| GET | `/api/puell` | Puell：值 / 区域 / 是否触发 / 近 180 日序列 |
| GET | `/api/indicators` | Dashboard 主接口：市场快照 + 三指标 + 策略结果 |
| GET | `/api/history?days=730` | 价格 + MA200W 历史序列 |
| POST | `/api/backtest` | 运行策略回测（参数见 `BacktestRequest`） |
| GET/POST/PUT/DELETE | `/api/records` | 投资记录 CRUD |
| GET/PUT | `/api/settings` | 读取 / 保存策略与数据设置 |
| GET | `/api/reserve` | 加速资金池状态 + 当前风险等级 + 释放建议 |
| POST | `/api/reserve/deploy` | 执行加速买入（自动写入 Acceleration Buy 记录） |
| POST | `/api/reserve/reset` | 重置资金池（新周期 / 测试） |
| POST | `/api/refresh` | 清缓存并强制刷新数据 |

## 项目结构

```text
├── frontend/                     # React + TS + Tailwind + Recharts
│   └── src/
│       ├── components/
│       │   ├── dashboard/        # PriceHero / IndicatorCard / StrategyPanel / MarketChart
│       │   ├── simulator/        # 回测表单 / 对比表格 / 图表
│       │   ├── layout/           # Sidebar / TopBar / AppShell
│       │   └── ui/               # 基础组件（Card / Badge / Button / Inputs…）
│       ├── pages/                # Dashboard / Simulator / Records / Settings
│       ├── services/             # API 客户端
│       ├── hooks/                # useMarketData / useRecords / useHistory
│       └── context/              # Settings / MarketData 全局状态
├── backend/
│   ├── prisma/                   # Prisma schema + 迁移
│   └── src/
│       ├── strategy-engine/
│       │   ├── acceleration/    # RiskLevel / CapitalAllocation / ReserveEngine + 单测
│       │   ├── indicators/       # MA200W / MVRV / Puell 指标实现 + 时序计算
│       │   ├── registry.ts       # 指标注册表（资产 -> 指标）
│       │   └── strategyEngine.ts # 评分 + 投资金额计算
│       ├── backtest/             # 回测引擎
│       ├── services/
│       │   ├── providers/        # CoinGecko / CoinMetrics / Bitbo / Demo
│       │   └── marketDataService.ts
│       ├── routes/               # market / backtest / records / settings / health
│       └── db/                   # 记录仓储（Prisma + 文件回退）
└── database/                     # docker-compose + 初始化脚本
```

## 扩展新资产（ETH / 黄金 / 纳指）

指标系统已模块化：

1. 在 `backend/src/strategy-engine/indicators/` 新建指标实现（实现 `MarketIndicator` 接口）；
2. 在 `registry.ts` 中为资产注册指标（如 `eth: [mvrvEthIndicator, ...]`）；
3. 数据服务中为对应资产接入价格 / 链上数据 Provider 即可。

策略引擎与回测引擎无需改动。

## 单元测试

```bash
npm test -w backend
```

测试覆盖：Risk Level 映射、资金分配计算、加速资金释放比例、余额截断、月度上限、跨月重置、资金耗尽等核心逻辑（基于 Node.js 内置 test runner，无额外依赖）。

## 风险提示

本项目仅供策略研究使用，不构成投资建议。回测基于历史数据，动态策略在低估区间加仓会显著增加投入资金与波动，请根据自身风险承受能力设置参数。加密货币投资有风险。
