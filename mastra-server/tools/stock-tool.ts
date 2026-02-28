import { createTool } from "@mastra/core/tools";
import { z } from "zod";

interface YahooQuoteResponse {
  quoteResponse: {
    error: {
      description?: string;
      code?: string;
    } | null;
    result: Array<{
      symbol: string;
      shortName?: string;
      longName?: string;
      currency?: string;
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      regularMarketTime?: number;
      marketState?: string;
    }>;
  };
}

export const stockQuoteTool = createTool({
  id: "get-stock-quote",
  description: "Get a real-time stock quote by symbol from Yahoo Finance",
  inputSchema: z.object({
    symbol: z.string().describe("Ticker symbol, e.g. AAPL, TSLA, 0700.HK"),
  }),
  outputSchema: z.object({
    symbol: z.string(),
    name: z.string(),
    currency: z.string(),
    price: z.number(),
    change: z.number(),
    changePercent: z.number(),
    marketState: z.string().optional(),
    quoteTime: z.string(),
  }),
  execute: async (inputData) => {
    const symbol = inputData.symbol.trim();
    if (!symbol) {
      throw new Error("Symbol is required");
    }

    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(
      symbol,
    )}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Yahoo Finance request failed: ${response.status}`);
    }
    const data = (await response.json()) as YahooQuoteResponse;
    const error = data.quoteResponse.error;
    if (error) {
      throw new Error(error.description || "Yahoo Finance error");
    }

    const quote = data.quoteResponse.result?.[0];
    if (!quote?.symbol || quote.regularMarketPrice == null) {
      throw new Error(`Symbol '${symbol}' not found`);
    }

    return {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || quote.symbol,
      currency: quote.currency || "USD",
      price: quote.regularMarketPrice,
      change: quote.regularMarketChange || 0,
      changePercent: quote.regularMarketChangePercent || 0,
      marketState: quote.marketState,
      quoteTime: quote.regularMarketTime
        ? new Date(quote.regularMarketTime * 1000).toISOString()
        : new Date().toISOString(),
    };
  },
});
