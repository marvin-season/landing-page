import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type') || 'realtime'; // 'realtime' | 'history'

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
    if (type === 'history') {
        const date = searchParams.get('date');
        if (!date) {
            return NextResponse.json({ error: 'Missing date parameter for history type' }, { status: 400 });
        }

        const targetUrl = `http://api.fund.eastmoney.com/f10/lsjz?fundCode=${code}&pageIndex=1&pageSize=1&startDate=${date}&endDate=${date}`;
        
        const response = await fetch(targetUrl, {
            headers: {
                'Referer': 'http://fund.eastmoney.com/',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            },
            next: { revalidate: 3600 } // Cache history for 1 hour
        });

        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch history data' }, { status: response.status });
        }

        const data = await response.json();
        // data.Data.LSJZList[0].DWJZ
        const lsjzList = data?.Data?.LSJZList;
        if (Array.isArray(lsjzList) && lsjzList.length > 0) {
             const item = lsjzList[0];
             return NextResponse.json({
                 code,
                 date: item.FSRQ,
                 dwjz: item.DWJZ, // 单位净值
                 ljsjz: item.LJJZ, // 累计净值
                 jzzzl: item.JZZZL // 日增长率
             });
        } else {
            return NextResponse.json({ error: 'No data found for this date', code: 'NO_DATA' }, { status: 404 });
        }
    } else {
        // Realtime estimation
        const targetUrl = `http://fundgz.1234567.com.cn/js/${code}.js`;
        // We fetch with cache: 'no-store' to ensure we get the latest data
        const response = await fetch(targetUrl, {
           headers: {
               'Referer': 'http://fund.eastmoney.com/',
               'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
           },
           next: { revalidate: 0 }
        });
    
        if (!response.ok) {
           return NextResponse.json({ error: 'Failed to fetch fund data' }, { status: response.status });
        }
    
        const text = await response.text();
        // Expected format: jsonpgz({"fundcode":"001186","name":"...","jzrq":"2023-10-27","dwjz":"0.8880","gsz":"0.8890","gszzl":"0.11","gztime":"2023-10-30 15:00"});
        const match = text.match(/jsonpgz\((.*)\)/);
    
        if (match?.[1]) {
          try {
            const raw = JSON.parse(match[1]) as {
              fundcode?: string;
              name?: string;
              gsz?: string;
              gszzl?: string;
              gztime?: string;
            };
            return NextResponse.json({
              code: raw.fundcode ?? code,
              name: raw.name ?? "",
              gsz: raw.gsz ?? "",
              gszzl: raw.gszzl ?? "",
              gztime: raw.gztime ?? "",
            });
          } catch {
             return NextResponse.json({ error: 'Failed to parse JSON from JSONP' }, { status: 500 });
          }
        } else {
            return NextResponse.json({ error: 'Invalid response format or fund code not found' }, { status: 404 });
        }
    }

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
