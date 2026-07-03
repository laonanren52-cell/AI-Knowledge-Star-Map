# 知脉 AI 后端代理

前端不要配置模型 API Key。DeepSeek、OpenAI、搜索和 OCR 相关密钥只放在后端环境变量中。

## 启动

先进入项目根目录，再启动后端：

```bash
cd C:\Users\cheng\Documents\Codex\2026-07-02\files-mentioned-by-the-user-ai
npm run dev:api
```

默认监听：

```text
http://127.0.0.1:3001
```

前端另开一个终端启动：

```bash
npm run dev
```

## 前端切换

真实后端代理：

```env
VITE_AI_PROVIDER=api
VITE_API_BASE_URL=http://localhost:3001
```

只做演示：

```env
VITE_AI_PROVIDER=mock
```

## 后端模型 Key

优先读取 DeepSeek：

```env
DEEPSEEK_API_KEY=
DEEPSEEK_MODEL=deepseek-chat
```

没有 DeepSeek Key 时读取 OpenAI：

```env
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

如果两个 Key 都没有，后端健康状态会显示 `mock`。当前端使用 `VITE_AI_PROVIDER=api` 时，正式 AI 接口不会自动伪装成 mock，会返回明确错误；需要演示时请把前端切换为 `VITE_AI_PROVIDER=mock`。

## 联网搜索

当前代理内置 Tavily、Brave Search、SerpApi 搜索适配：

```env
WEB_SEARCH_ENABLED=true
SEARCH_PROVIDER=tavily
TAVILY_API_KEY=
BRAVE_SEARCH_API_KEY=
SERPAPI_KEY=
```

`SEARCH_PROVIDER` 可选：`tavily`、`brave`、`serpapi`。未填写时按可用 key 自动选择。

未配置时，`POST /api/search` 不会伪造网页结果，会返回：

```text
联网搜索暂未配置，请在后端配置搜索 API。
```

## 接口

- `GET /api/health`
- `POST /api/ai/analyze`
- `POST /api/ai/ask`
- `POST /api/ai/generate-output`
- `POST /api/search`
