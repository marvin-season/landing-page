import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Missing code parameter' }, { status: 400 });
  }

  try {
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

  } catch (error) {
    console.error('Proxy Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
