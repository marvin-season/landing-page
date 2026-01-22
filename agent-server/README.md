## 安装

清空代理
```bash
export http_proxy=\nexport https_proxy=\nexport all_proxy=\nexport HTTP_PROXY=\nexport HTTPS_PROXY=\nexport ALL_PROXY=\nexport no_proxy=127.0.0.1,localhost
```

```bash
uv sync
```
```bash
source .venv/bin/activate
```

## 启动

```bash
uv run app.py
```