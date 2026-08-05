import { useHistory } from '@/hooks/useHistory';
import { useMarket } from '@/context/MarketDataContext';
import { useReserve } from '@/hooks/useReserve';
import { usePortfolio } from '@/hooks/usePortfolio';
import { AccelerationPanel } from '@/components/dashboard/AccelerationPanel';
import { FundingPlanCards } from '@/components/dashboard/FundingPlanCards';
import { IndicatorCard } from '@/components/dashboard/IndicatorCard';
import { MarketChart } from '@/components/dashboard/MarketChart';
import { PriceHero } from '@/components/dashboard/PriceHero';
import { StrategyPanel } from '@/components/dashboard/StrategyPanel';
import { ErrorBlock, LoadingBlock } from '@/components/ui/Spinner';

export function Dashboard() {
  const { data, loading, error, refresh } = useMarket();
  const { data: history } = useHistory(730);
  const reserve = useReserve();
  const portfolio = usePortfolio();

  if (loading && !data) return <LoadingBlock label="正在获取 BTC 市场数据…" />;
  if (error && !data) return <ErrorBlock message={error} onRetry={() => void refresh()} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      <PriceHero market={data.market} strategy={data.strategy} history={history} />

      <FundingPlanCards reserve={reserve.data} portfolio={portfolio.data} />

      <div className="grid gap-5 lg:grid-cols-3">
        {data.indicators.map((ind) => (
          <IndicatorCard key={ind.id} indicator={ind} />
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <StrategyPanel strategy={data.strategy} frequency={data.strategyConfig.frequency} />
        </div>
        <div className="xl:col-span-3">
          <AccelerationPanel
            reserve={reserve.data}
            loading={reserve.loading}
            deploying={reserve.deploying}
            message={reserve.message}
            onDeploy={() => void reserve.deploy()}
            onReset={() => {
              if (window.confirm('确定重置加速资金池？此操作会清空已释放记录。')) {
                void reserve.resetMonth();
              }
            }}
          />
        </div>
      </div>

      <MarketChart />
    </div>
  );
}
