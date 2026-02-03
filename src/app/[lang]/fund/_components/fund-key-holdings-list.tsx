// 重仓股

import { useQuery } from "@tanstack/react-query";
import { fetchFundHoldings } from "@/app/[lang]/fund/_utils/fund-api";

export function FundKeyHoldingsList(props: { code: string }) {
  const { code } = props;
  const { data: holdingsData, isFetching } = useQuery({
    queryKey: ["fundHoldings", code],
    queryFn: () => fetchFundHoldings(code),
    enabled: !!code,
  });
  const holdings = holdingsData ?? [];

  return (
    holdings.length > 0 && (
      <div className="pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">重仓股</h4>
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-3 py-2 text-left font-medium">#</th>
                <th className="px-3 py-2 text-left font-medium">代码</th>
                <th className="px-3 py-2 text-left font-medium">名称</th>
                <th className="px-3 py-2 text-right font-medium">占比</th>
              </tr>
            </thead>
            <tbody>
              {isFetching && !holdingsData ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-2 text-center text-muted-foreground"
                  >
                    Loading...
                  </td>
                </tr>
              ) : (
                holdings.map((s) => (
                  <tr key={s.stockCode} className="border-b last:border-0">
                    <td className="px-3 py-2 text-muted-foreground">
                      {s.rank}
                    </td>
                    <td className="px-3 py-2 font-mono">{s.stockCode}</td>
                    <td className="px-3 py-2 truncate max-w-[140px]">
                      {s.stockName}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {s.holdRatio.toFixed(2)}%
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    )
  );
}
