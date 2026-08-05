import type { AssetId } from '../types/market';
import type { MarketIndicator } from './indicators/Indicator';
import { ma200wIndicator } from './indicators/ma200wIndicator';
import { mvrvIndicator } from './indicators/mvrvIndicator';
import { puellIndicator } from './indicators/puellIndicator';

/**
 * 指标注册表：资产 -> 指标列表。
 * 新增资产（ETH / 黄金 / 纳指）时在对应资产下注册指标即可，
 * 策略引擎与回测引擎无需改动。
 */
export const indicatorRegistry: Record<AssetId, MarketIndicator[]> = {
  btc: [ma200wIndicator, mvrvIndicator, puellIndicator],
  eth: [],
  gold: [],
  nasdaq: [],
};

export function getIndicators(asset: AssetId): MarketIndicator[] {
  return indicatorRegistry[asset] ?? [];
}

export function getSupportedAssets(): Array<{
  id: AssetId;
  name: string;
  enabled: boolean;
  indicatorCount: number;
}> {
  return (Object.keys(indicatorRegistry) as AssetId[]).map((id) => ({
    id,
    name: { btc: '比特币', eth: '以太坊', gold: '黄金', nasdaq: '纳斯达克' }[id],
    enabled: id === 'btc',
    indicatorCount: indicatorRegistry[id].length,
  }));
}
