// http://hq.sinajs.cn/list=sh600519
const res = fetch("http://hq.sinajs.cn/list=sh600519", {
  headers: {
    referer: "https://finance.sina.com.cn/",
  },
});
res.then(async (res) => {
  const body = res.body;
  const reader = body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    console.log(text);
  }
  // console.log(result)
});
