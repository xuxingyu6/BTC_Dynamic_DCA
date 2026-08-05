import { config } from '../config';
import { settingsStore } from '../settings/settingsStore';
import { FileCache } from './fileCache';
import { fetchBtcSnapshot } from './providers/coinGecko';
import { fetchBtcDailyHistory } from './providers/coinMetrics';
import { generateDemoBars } from './providers/demoData';
import * as bitbo from './providers/bitbo';
import { buildIndicatorSeries } from '../strategy-engine/indicators/historyIndicators';
import { getIndicators } from '../strategy-engine/registry';
import { evaluateStrategy } from '../strategy-engine/strategyEngine';
import { allocateMonthlyBudget } from '../strategy-engine/acceleration/capitalAllocationEngine';
import type {
  DailyBar,
  DataSource,
  HistoryPoint,
  IndicatorSeries,
  MarketSnapshot,
} from '../types/market';
import type { IndicatorEvaluation } from '../strategy-engine/types';
import { round2 } from '../utils/numbers';
import { addDays, toISODate } from '../utils/time';

/**
 * 市场数据服务：统一编排数据获取、缓存与降级。
 *
 * 数据链路：
 *   价格快照  -> CoinGecko（失败则用历史序列兜底）
 *   历史日线  -> CoinMetrics（失败则生成演示数据）
 *   MVRV/Puell -> 由历史日线计算（可被用户手动覆盖）
 */

interface HistoryBundle {
  bars: DailyBar[];
  source: DataSource;
}

export class MarketDataService {
  private historyCache: HistoryBundle | null = null;
  private seriesCache: IndicatorSeries | null = null;
  private lastSource: DataSource | null = null;
  /** single-flight：并发请求共享同一次数据加载，避免竞态覆盖缓存 */
  private historyPromise: Promise<HistoryBundle> | null = null;
  private seriesPromise: Promise<IndicatorSeries> | null = null;

  constructor(private readonly cache: FileCache) {}

  /** 当前数据源状态（供健康检查 / 前端展示） */
  get dataSource(): DataSource | null {
    return this.lastSource;
  }

  /** 获取完整历史日线（含缓存与降级） */
  async getHistory(force = false): Promise<HistoryBundle> {
    if (this.historyCache && !force) return this.historyCache;

    if (!force) {
      const cached = await this.cache.get<HistoryBundle>('history', config.cache.onchainTtlMs);
      if (cached && cached.bars.length > 0) {
        this.historyCache = cached;
        this.lastSource = cached.source;
        return cached;
      }
    }

    if (this.historyPromise) return this.historyPromise;
    this.historyPromise = this.loadHistory(force);
    try {
      const result = await this.historyPromise;
      this.historyCache = result;
      return result;
    } finally {
      this.historyPromise = null;
    }
  }

  private async loadHistory(force: boolean): Promise<HistoryBundle> {
    const settings = await settingsStore.get();
    if (settings.data.providerMode !== 'demo') {
      try {
        const bars = await fetchBtcDailyHistory();
        const bundle: HistoryBundle = { bars, source: 'live' };
        this.lastSource = 'live';
        this.seriesCache = null;
        await this.cache.set('history', bundle);
        return bundle;
      } catch (err) {
        console.warn(`[market] 实时历史数据获取失败，降级为演示数据: ${(err as Error).message}`);
      }
    }

    const bundle: HistoryBundle = { bars: generateDemoBars(), source: 'demo' };
    this.lastSource = 'demo';
    this.seriesCache = null;
    await this.cache.set('history', bundle);
    return bundle;
  }

  /** 当前价格快照 */
  async getSnapshot(force = false): Promise<MarketSnapshot> {
    if (!force) {
      const cached = await this.cache.get<MarketSnapshot>('snapshot', config.cache.snapshotTtlMs);
      if (cached && cached.price > 0) return cached;
    }

    const settings = await settingsStore.get();
    if (settings.data.providerMode !== 'demo') {
      try {
        const s = await fetchBtcSnapshot();
        const snapshot: MarketSnapshot = {
          price: s.price,
          change24hPct: s.change24hPct,
          ath: s.ath,
          athDate: s.athDate,
          athDistancePct: round2((s.price / s.ath - 1) * 100),
          marketCap: s.marketCap,
          marketCapRank: s.marketCapRank,
          updatedAt: new Date().toISOString(),
          source: 'coingecko',
        };
        await this.cache.set('snapshot', snapshot);
        return snapshot;
      } catch (err) {
        console.warn(`[market] CoinGecko 快照失败，使用历史数据兜底: ${(err as Error).message}`);
      }
    }

    const { bars } = await this.getHistory();
    const last = bars[bars.length - 1];
    const prev = bars[bars.length - 2];
    let ath = 0;
    let athDate = null;
    for (const b of bars) {
      if (b.price > ath) {
        ath = b.price;
        athDate = b.date;
      }
    }
    const snapshot: MarketSnapshot = {
      price: last.price,
      change24hPct: prev ? round2((last.price / prev.price - 1) * 100) : 0,
      ath,
      athDate,
      athDistancePct: round2((last.price / ath - 1) * 100),
      marketCap: last.marketCap ?? null,
      marketCapRank: null,
      updatedAt: new Date().toISOString(),
      source: this.lastSource === 'live' ? 'coinmetrics' : 'demo',
    };
    await this.cache.set('snapshot', snapshot);
    return snapshot;
  }

  /** 指标时序（MA200W / MVRV / Puell） */
  async getSeries(force = false): Promise<IndicatorSeries> {
    if (this.seriesCache && !force) return this.seriesCache;
    if (this.seriesPromise) return this.seriesPromise;
    this.seriesPromise = this.loadSeries(force);
    try {
      const series = await this.seriesPromise;
      this.seriesCache = series;
      return series;
    } finally {
      this.seriesPromise = null;
    }
  }

  private async loadSeries(force: boolean): Promise<IndicatorSeries> {
    const { bars, source } = await this.getHistory(force);
    const series = buildIndicatorSeries(bars);
    if (source !== 'demo') {
      await this.applyBitboOverlay(series, force);
    }
    return series;
  }

  /**
   * Bitbo 实时指标覆盖（可选）。
   * 配置 BITBO_API_KEY 后，用 Bitbo 的 MVRV / Puell / 200W MA 覆盖模型估算值。
   */
  private bitboActive = false;
  private async applyBitboOverlay(series: IndicatorSeries, force: boolean): Promise<void> {
    if (!config.bitboApiKey) return;

    interface OverlayPayload {
      mvrv: Array<[string, number]>;
      puell: Array<[string, number]>;
      ma200w: Array<[string, number]>;
    }
    const apply = (payload: OverlayPayload) => {
      for (const [date, v] of payload.mvrv) series.mvrv.set(date, v);
      for (const [date, v] of payload.puell) series.puell.set(date, v);
      for (const [date, v] of payload.ma200w) series.ma200w.set(date, v);
      this.bitboActive = true;
    };

    if (!force) {
      const cached = await this.cache.get<OverlayPayload>('bitbo-overlay', config.cache.onchainTtlMs);
      if (cached) {
        apply(cached);
        return;
      }
    }

    const today = toISODate(new Date());
    try {
      const [mvrv, puell, ma200w] = await Promise.all([
        bitbo.fetchMvrvSeries('2013-12-01', today),
        bitbo.fetchPuellSeries('2013-12-01', today),
        bitbo.fetchMa200wSeries('2013-12-01', today),
      ]);
      const payload: OverlayPayload = {
        mvrv: mvrv.map((p) => [p.date, p.value] as [string, number]),
        puell: puell.map((p) => [p.date, p.value] as [string, number]),
        ma200w: ma200w.map((p) => [p.date, p.value] as [string, number]),
      };
      await this.cache.set('bitbo-overlay', payload);
      apply(payload);
      console.log('[bitbo] 已启用 Bitbo 实时指标覆盖（MVRV / Puell / 200W MA）');
    } catch (err) {
      console.warn(`[bitbo] 实时指标覆盖失败，使用模型估算: ${(err as Error).message}`);
    }
  }

  /** 聚合市场状态：快照 + 指标评估 + 策略结果 */
  async getIndicatorsSnapshot(force = false) {
    const [snapshot, series, settings] = await Promise.all([
      this.getSnapshot(force),
      this.getSeries(force),
      settingsStore.get(),
    ]);

    const mvrvRaw = series.mvrv.get(snapshot.updatedAt.slice(0, 10));
    const puellRaw = series.puell.get(snapshot.updatedAt.slice(0, 10));

    // 最新日期可能滞后于系统时间（例如历史数据只到今天），逐日回退查找
    const today = toISODate(new Date());
    const lookup = <T>(m: Map<string, T>): T | null => {
      const direct = m.get(today);
      if (direct !== undefined) return direct;
      for (let i = 1; i <= 7; i++) {
        const v = m.get(toISODate(addDays(new Date(), -i)));
        if (v !== undefined) return v;
      }
      return null;
    };
    const mvrv = lookup(series.mvrv);
    const puell = lookup(series.puell);
    const ma = lookup(series.ma200w);

    const manualOverride = settings.data.manualOverride;
    const indicators = getIndicators('btc').map((ind) => {
      const input = {
        asset: 'btc' as const,
        price: snapshot.price,
        ma200w: ma,
        mvrv: manualOverride.mvrv ?? mvrvRaw ?? mvrv,
        puell: manualOverride.puell ?? puellRaw ?? puell,
        thresholds: settings.indicators,
        manualOverrides: {
          mvrv: manualOverride.mvrv !== null,
          puell: manualOverride.puell !== null,
        },
      };
      return ind.evaluate(input);
    });

    // 来源标注：手动覆盖 > 演示历史 > 估算（MVRV/Puell 模型推算）> 实时
    const historyIsDemo = this.lastSource === 'demo';
    const labeled = indicators.map((ind) => {
      if (ind.id === 'mvrv' && manualOverride.mvrv !== null) return { ...ind, source: 'manual' };
      if (ind.id === 'puell' && manualOverride.puell !== null) return { ...ind, source: 'manual' };
      if (historyIsDemo) return { ...ind, source: 'demo' };
      if (ind.id === 'ma200w') return { ...ind, source: 'live' };
      if (ind.id === 'mvrv') return { ...ind, source: this.bitboActive ? 'live' : 'estimate' };
      return { ...ind, source: 'live' }; // Puell 基于 CoinMetrics IssTotUSD 真实收入
    });

    const allocation = allocateMonthlyBudget(settings.capital);
    const strategy = evaluateStrategy(labeled, settings.strategy, allocation);
    const source: DataSource =
      snapshot.source === 'demo' || this.lastSource === 'demo' ? 'demo' : 'live';

    return {
      asset: 'btc',
      updatedAt: snapshot.updatedAt,
      source,
      market: {
        price: snapshot.price,
        change24hPct: snapshot.change24hPct,
        ath: snapshot.ath,
        athDate: snapshot.athDate,
        athDistancePct: snapshot.athDistancePct,
        marketCap: snapshot.marketCap,
        marketCapRank: snapshot.marketCapRank,
      },
      indicators: labeled,
      strategy,
      thresholds: settings.indicators,
      strategyConfig: settings.strategy,
    };
  }

  /** 单一指标接口（/api/mvrv 等） */
  async getSingleIndicator(
    id: string,
    force = false
  ): Promise<IndicatorEvaluation & { series: Array<{ date: string; value: number }>; updatedAt: string } | null> {
    const full = await this.getIndicatorsSnapshot(force);
    const ind = full.indicators.find((i: IndicatorEvaluation) => i.id === id);
    if (!ind) return null;
    const series = await this.getSeries();
    const map = id === 'ma200w' ? series.ma200w : id === 'mvrv' ? series.mvrv : series.puell;
    const recent = Array.from(map.entries())
      .slice(-180)
      .map(([date, value]) => ({ date, value: round2(value) }));
    return { ...ind, series: recent, updatedAt: new Date().toISOString() };
  }

  /** 历史图表数据（价格 + MA200W） */
  async getHistoryPoints(days: number, force = false): Promise<{ source: DataSource; points: HistoryPoint[] }> {
    const { bars, source } = await this.getHistory(force);
    const series = await this.getSeries(force);
    const sliced = bars.slice(-days);
    const points = sliced.map((b) => ({
      date: b.date,
      price: b.price,
      ma200w: series.ma200w.get(b.date) ?? null,
    }));
    return { source, points };
  }

  /** 手动刷新：清缓存 + 重新拉取 */
  async refresh(): Promise<{ cleared: string[]; source: DataSource | null }> {
    this.historyCache = null;
    this.seriesCache = null;
    const cleared = await this.cache.clear();
    await Promise.all([this.getSnapshot(true), this.getSeries(true)]);
    return { cleared, source: this.lastSource };
  }
}

const cache = new FileCache(config.dataDir + '/cache');
export const marketDataService = new MarketDataService(cache);
