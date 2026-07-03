import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const PORT = Number(process.env.PORT || process.env.API_PORT || 3001);
const JSON_LIMIT_BYTES = 1024 * 1024 * 2;

const relationTypes = new Set(["mentions", "belongs_to", "uses", "depends_on", "solves", "generates", "related_to"]);
const nodeTypes = new Set(["project", "document", "tech", "problem", "output", "tag", "concept"]);
const ADMIN_USER_ID = "admin_default";
const ADMIN_PUBLIC_WORKSPACE_ID = "admin_public_default";

const demoUsers = [
  { id: ADMIN_USER_ID, username: "admin", email: "admin@zhimai.local", role: "admin", isDemo: true },
  { id: "user_default", username: "user", email: "user@zhimai.local", role: "user", isDemo: true },
];

function privateWorkspaceId(userId) {
  return `user_private_${userId}`;
}

function createWorkspace(user) {
  const stamp = new Date().toISOString();
  return {
    id: privateWorkspaceId(user.id),
    name: `${user.username} 的个人星图`,
    type: "user_private",
    ownerId: user.id,
    visibility: "private",
    createdAt: stamp,
    updatedAt: stamp,
    description: "用户个人知识空间。",
    version: 1,
  };
}

function listWorkspaces() {
  const stamp = new Date().toISOString();
  return [
    {
      id: ADMIN_PUBLIC_WORKSPACE_ID,
      name: "管理员共享星图",
      type: "admin_public",
      ownerId: ADMIN_USER_ID,
      visibility: "public",
      createdAt: stamp,
      updatedAt: stamp,
      lastPublishedAt: stamp,
      description: "管理员维护的共享知识空间。",
      version: 1,
      updateSummary: "初始化共享知识空间。",
    },
    ...demoUsers.map(createWorkspace),
  ];
}

function userFromRequest(req) {
  const id = String(req.headers["x-zhimai-user-id"] || "");
  const role = String(req.headers["x-zhimai-user-role"] || "user");
  const known = demoUsers.find((user) => user.id === id || user.username === id);
  return known || { id: id || "anonymous", username: id || "anonymous", email: "", role: role === "admin" ? "admin" : "user" };
}

function workspaceFromRequest(req, payload = {}) {
  const workspaceId = String(payload.workspaceId || req.headers["x-zhimai-workspace-id"] || ADMIN_PUBLIC_WORKSPACE_ID);
  return listWorkspaces().find((workspace) => workspace.id === workspaceId) || null;
}

function canReadWorkspace(user, workspace) {
  if (!user || !workspace) return false;
  if (workspace.type === "admin_public" || workspace.type === "demo_public") return true;
  return workspace.ownerId === user.id;
}

function canEditWorkspace(user, workspace) {
  if (!user || !workspace) return false;
  if (user.role === "admin" && workspace.type === "admin_public") return true;
  return workspace.type === "user_private" && workspace.ownerId === user.id;
}

function enforceWorkspaceAccess(req, payload, mode) {
  const user = userFromRequest(req);
  const workspace = workspaceFromRequest(req, payload);
  const allowed = mode === "write" ? canEditWorkspace(user, workspace) : canReadWorkspace(user, workspace);
  if (!allowed) {
    const reason = workspace?.type === "admin_public" ? "你当前只有查看权限，不能修改管理员共享星图。" : "你没有访问或编辑该知识空间的权限。";
    const error = new Error(reason);
    error.statusCode = mode === "write" ? 403 : 401;
    throw error;
  }
  return { user, workspace };
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) return;
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const rawValue = trimmed.slice(index + 1).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

function jsonResponse(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Zhimai-User-Id,X-Zhimai-User-Role,X-Zhimai-Workspace-Id",
  });
  res.end(body);
}

function readJson(req) {
  return new Promise((resolveJson, reject) => {
    let size = 0;
    let body = "";
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > JSON_LIMIT_BYTES) {
        reject(new Error("请求体过大，请减少资料内容后重试。"));
        req.destroy();
        return;
      }
      body += chunk;
    });
    req.on("end", () => {
      if (!body.trim()) {
        resolveJson({});
        return;
      }
      try {
        resolveJson(JSON.parse(body));
      } catch {
        reject(new Error("请求 JSON 格式不正确。"));
      }
    });
    req.on("error", reject);
  });
}

function getProviderConfig() {
  const requested = (process.env.AI_PROVIDER || "").toLowerCase();
  if ((requested === "deepseek" || !requested) && process.env.DEEPSEEK_API_KEY) {
    return {
      provider: "deepseek",
      apiKey: process.env.DEEPSEEK_API_KEY,
      endpoint: process.env.DEEPSEEK_API_BASE_URL || "https://api.deepseek.com/chat/completions",
      model: process.env.DEEPSEEK_MODEL || process.env.AI_MODEL || "deepseek-chat",
    };
  }
  if ((requested === "openai" || !requested) && process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      endpoint: process.env.OPENAI_API_BASE_URL || "https://api.openai.com/v1/chat/completions",
      model: process.env.OPENAI_MODEL || process.env.AI_MODEL || "gpt-4o-mini",
    };
  }
  return { provider: "mock", apiKey: "", endpoint: "", model: "mock" };
}

function getSearchConfig() {
  if (process.env.WEB_SEARCH_ENABLED === "false") return { enabled: false, configured: false, provider: "disabled" };
  const requested = (process.env.SEARCH_PROVIDER || "").toLowerCase();
  if ((requested === "tavily" || !requested) && process.env.TAVILY_API_KEY) {
    return { enabled: true, configured: true, provider: "tavily", apiKey: process.env.TAVILY_API_KEY };
  }
  if ((requested === "brave" || !requested) && process.env.BRAVE_SEARCH_API_KEY) {
    return { enabled: true, configured: true, provider: "brave", apiKey: process.env.BRAVE_SEARCH_API_KEY };
  }
  if ((requested === "serpapi" || !requested) && process.env.SERPAPI_KEY) {
    return { enabled: true, configured: true, provider: "serpapi", apiKey: process.env.SERPAPI_KEY };
  }
  return { enabled: false, configured: false, provider: requested || "none" };
}

function slug(text) {
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function sourceFor(content, title = "用户上传资料") {
  const snippet = String(content || "").replace(/\s+/g, " ").trim().slice(0, 260);
  return [
    {
      sourceType: "local",
      documentId: `doc-${slug(title) || "upload"}`,
      documentTitle: title,
      snippet: snippet || "当前文件尚未完成正文解析，因此无法提供片段依据。",
      score: snippet ? 0.86 : 0.24,
      isParsed: Boolean(snippet),
    },
  ];
}

function mockAnalysis(content, fileName = "用户上传资料") {
  const text = String(content || "");
  const embedded = /stm32|gpio|pwm|oled|小车|电机|红外/i.test(text);
  const title = fileName || (embedded ? "STM32 智能循迹小车项目文档" : "AI 个人知识图谱系统资料");
  const keywords = embedded
    ? ["STM32", "GPIO", "PWM", "OLED", "红外循迹", "电机驱动"]
    : ["知识图谱", "RAG", "Embedding", "向量检索", "资料解析", "可信问答"];
  const projectLabel = embedded ? "STM32 智能循迹小车" : "知脉 AI 个人知识图谱系统";
  const nodes = [
    { id: "project-main", label: projectLabel, type: "project", group: "api", value: 32 },
    { id: "doc-main", label: title, type: "document", group: "api", value: 20 },
    ...keywords.map((keyword, index) => ({
      id: `tech-${slug(keyword) || index}`,
      label: keyword,
      type: index < 4 ? "tech" : "concept",
      group: "api",
      value: 12 + (index % 3) * 2,
    })),
    { id: "problem-source", label: embedded ? "联调问题定位" : "答案缺少来源", type: "problem", group: "api", value: 12 },
    { id: "output-summary", label: "项目总结", type: "output", group: "api", value: 14 },
  ];
  const edges = [
    { id: "edge-project-doc", from: "project-main", to: "doc-main", relationType: "belongs_to", label: "关联资料" },
    ...nodes
      .filter((node) => node.id.startsWith("tech-"))
      .map((node, index) => ({
        id: `edge-doc-${node.id}`,
        from: "doc-main",
        to: node.id,
        relationType: "mentions",
        label: "提到",
        weight: 0.68 + index * 0.03,
      })),
    { id: "edge-problem", from: "problem-source", to: "project-main", relationType: "related_to", label: "问题归因" },
    { id: "edge-output", from: "project-main", to: "output-summary", relationType: "generates", label: "生成" },
  ];
  return normalizeAnalysis({
    title,
    type: embedded ? "项目文档" : "知识库资料",
    summary: embedded
      ? "资料围绕 STM32 智能循迹小车展开，包含 GPIO、PWM、电机控制、OLED 显示和红外循迹等核心内容。"
      : "资料围绕个人知识图谱系统展开，包含资料解析、实体抽取、关系生成、可信问答和成果生成等内容。",
    keywords,
    entities: nodes,
    relations: edges,
    outputs: ["简历项目经历", "项目答辩稿", "PPT 大纲", "面试问答", "复习计划"],
    sources: sourceFor(text, title),
    confidence: 0.82,
  });
}

function mockAsk(question, localSources = [], webSources = []) {
  if (localSources.length === 0 && webSources.length === 0) {
    return {
      answer: "当前文件只有文件名，尚未完成正文解析，无法进行可靠回答。请重新上传可解析正文，或为扫描版 PDF 接入 OCR 后再提问。",
      sources: [],
      webSources: [],
      confidence: 0.12,
    };
  }
  const localText = localSources
    .slice(0, 4)
    .map((source, index) => `${index + 1}. ${source.documentTitle}：${source.snippet}`)
    .join("\n");
  const webText = webSources
    .slice(0, 3)
    .map((source, index) => `${index + 1}. ${source.title}（${source.siteName}）：${source.snippet}`)
    .join("\n");
  return {
    answer: [
      `针对「${question}」，当前回答基于可用来源生成。`,
      localText ? `本地资料依据\n${localText}` : "本地资料依据\n没有命中可用正文片段。",
      webText ? `网页补充\n${webText}` : "",
      "可信度说明：如果没有本地正文片段或真实网页来源，本回答不应作为可靠结论。",
    ]
      .filter(Boolean)
      .join("\n\n"),
    sources: localSources,
    webSources,
    confidence: localSources.length >= 2 ? 0.82 : localSources.length ? 0.62 : 0.4,
  };
}

function mockOutput(type, context) {
  const titles = {
    resume: "简历项目经历",
    defense: "项目答辩稿",
    ppt: "PPT 大纲",
    interview: "面试问答",
    review: "复习计划",
    summary: "项目总结",
  };
  const title = titles[type] || "知识成果";
  const documents = Array.isArray(context?.documents) ? context.documents : [];
  const sources = documents
    .filter((document) => document.canAnswer && Array.isArray(document.chunks))
    .flatMap((document) =>
      document.chunks.slice(0, 1).map((chunk) => ({
        sourceType: "local",
        documentId: document.id,
        documentTitle: document.title,
        snippet: chunk.text,
        score: document.confidence || 0.78,
        isParsed: true,
      })),
    )
    .slice(0, 3);
  const content = `这是基于当前资料生成的「${title}」。当前后端处于 mock 或演示生成状态；配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY 后，此接口会由后端代理调用真实模型生成内容。`;
  return {
    id: `api-output-${type}-${Date.now()}`,
    type,
    title,
    content,
    body: content,
    sources,
    createdAt: new Date().toISOString(),
    sourceStatus: "mock",
  };
}

function extractJson(text) {
  const raw = String(text || "").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced) return JSON.parse(fenced[1]);
    const first = raw.indexOf("{");
    const last = raw.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(raw.slice(first, last + 1));
    throw new Error("模型返回内容不是有效 JSON。");
  }
}

function normalizeSource(source, index = 0) {
  const snippet = String(source?.snippet || source?.text || "").slice(0, 500);
  const parsed = source?.isParsed !== undefined ? Boolean(source.isParsed) : Boolean(snippet.trim());
  return {
    sourceType: source?.sourceType || "local",
    documentId: String(source?.documentId || source?.id || `source-${index + 1}`),
    documentTitle: String(source?.documentTitle || source?.title || "资料来源"),
    snippet,
    score: Number.isFinite(Number(source?.score)) ? Number(source.score) : parsed ? 0.78 : 0.24,
    nodeId: source?.nodeId ? String(source.nodeId) : undefined,
    nodeLabel: source?.nodeLabel ? String(source.nodeLabel) : undefined,
    chunkId: source?.chunkId ? String(source.chunkId) : undefined,
    isParsed: parsed,
  };
}

function normalizeAnalysis(value) {
  const entities = Array.isArray(value?.entities) ? value.entities : [];
  const nodes = entities.slice(0, 120).map((node, index) => {
    const type = nodeTypes.has(node?.type) ? node.type : "concept";
    return {
      id: String(node?.id || `${type}-${index + 1}`),
      label: String(node?.label || node?.name || `节点 ${index + 1}`),
      type,
      group: String(node?.group || "ai"),
      description: node?.description ? String(node.description) : undefined,
      sourceDocumentIds: Array.isArray(node?.sourceDocumentIds) ? node.sourceDocumentIds.map(String) : undefined,
      value: Number.isFinite(Number(node?.value)) ? Number(node.value) : 10,
      confidence: Number.isFinite(Number(node?.confidence)) ? Number(node.confidence) : 0.82,
    };
  });
  const nodeIds = new Set(nodes.map((node) => node.id));
  const relations = Array.isArray(value?.relations) ? value.relations : [];
  const edges = relations
    .slice(0, 180)
    .map((edge, index) => ({
      id: String(edge?.id || `edge-${index + 1}`),
      from: String(edge?.from || ""),
      to: String(edge?.to || ""),
      label: edge?.label ? String(edge.label) : undefined,
      relationType: relationTypes.has(edge?.relationType) ? edge.relationType : "related_to",
      weight: Number.isFinite(Number(edge?.weight)) ? Number(edge.weight) : 0.68,
      confidence: Number.isFinite(Number(edge?.confidence)) ? Number(edge.confidence) : 0.8,
      evidence: edge?.evidence ? String(edge.evidence) : undefined,
    }))
    .filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to));

  return {
    title: String(value?.title || "AI 资料分析结果"),
    type: String(value?.type || "资料"),
    summary: String(value?.summary || "AI 已完成资料分析。"),
    keywords: Array.isArray(value?.keywords) ? value.keywords.map(String).slice(0, 16) : [],
    entities: nodes,
    relations: edges,
    outputs: Array.isArray(value?.outputs) ? value.outputs.map(String).slice(0, 8) : [],
    sources: Array.isArray(value?.sources) ? value.sources.map(normalizeSource) : [],
    confidence: Number.isFinite(Number(value?.confidence)) ? Number(value.confidence) : 0.82,
  };
}

function normalizeAsk(value) {
  return {
    answer: String(value?.answer || "当前资料不足以可靠回答。"),
    sources: Array.isArray(value?.sources) ? value.sources.map(normalizeSource) : [],
    webSources: Array.isArray(value?.webSources) ? value.webSources.map(normalizeWebSource) : [],
    confidence: Number.isFinite(Number(value?.confidence)) ? Number(value.confidence) : 0.62,
    warnings: Array.isArray(value?.warnings) ? value.warnings.map(String) : [],
    sourceStatus: value?.sourceStatus || "api",
  };
}

function normalizeWebSource(source) {
  return {
    title: String(source?.title || "网页来源"),
    siteName: String(source?.siteName || source?.site || "web"),
    url: String(source?.url || ""),
    snippet: String(source?.snippet || source?.summary || "").slice(0, 500),
    retrievedAt: String(source?.retrievedAt || new Date().toISOString()),
    relevance: Number.isFinite(Number(source?.relevance ?? source?.score)) ? Number(source?.relevance ?? source?.score) : undefined,
  };
}

function normalizeOutput(value, type) {
  const content = String(value?.content || value?.body || "当前资料不足以生成可靠成果。");
  return {
    id: String(value?.id || `api-output-${type}-${Date.now()}`),
    type,
    title: String(value?.title || "生成成果"),
    content,
    body: content,
    sources: Array.isArray(value?.sources) ? value.sources.map(normalizeSource) : [],
    createdAt: new Date().toISOString(),
    sourceStatus: value?.sourceStatus || "api",
  };
}

async function callChatJson(messages, temperature = 0.25, allowMock = true) {
  const config = getProviderConfig();
  if (config.provider === "mock") {
    if (!allowMock) {
      throw new Error("后端未检测到模型 API Key。请配置 DEEPSEEK_API_KEY 或 OPENAI_API_KEY，或将前端切换到 VITE_AI_PROVIDER=mock。");
    }
    return null;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(process.env.AI_TIMEOUT_MS || 45000));
  try {
    const response = await fetch(config.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages,
        temperature,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`模型接口返回 ${response.status}: ${text.slice(0, 240)}`);
    }
    const payload = await response.json();
    const content = payload?.choices?.[0]?.message?.content;
    if (!content) throw new Error("模型响应缺少 message.content。");
    return extractJson(content);
  } finally {
    clearTimeout(timer);
  }
}

function systemPrompt() {
  return [
    "你是知脉 AI 的后端分析代理。只返回严格 JSON，不要返回 Markdown。",
    "图谱节点 type 必须是 project/document/tech/problem/output/tag/concept。",
    "关系 relationType 必须是 mentions/belongs_to/uses/depends_on/solves/generates/related_to。",
    "所有回答必须基于用户资料、localSources 或 webSources；无法确认时降低 confidence，并在 sources 中给出依据片段。",
  ].join("\n");
}

async function analyze(payload) {
  const content = String(payload.content || "");
  const fileName = String(payload.fileName || payload.title || "用户上传资料");
  const allowMock = payload.allowMock !== false;
  if (!content.trim()) throw new Error("资料内容为空，无法分析。");
  const modelJson = await callChatJson(
    [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: `请分析以下资料并返回 JSON，字段必须包含 title,type,summary,keywords,entities,relations,outputs,sources,confidence。\n资料标题：${fileName}\n资料内容：\n${content.slice(0, 16000)}`,
      },
    ],
    0.18,
    allowMock,
  );
  if (modelJson) return normalizeAnalysis(modelJson);
  if (!allowMock) throw new Error("真实 AI 未返回分析结果。");
  return mockAnalysis(content, fileName);
}

async function ask(payload) {
  const question = String(payload.question || "");
  const allowMock = payload.allowMock !== false;
  if (!question.trim()) throw new Error("问题为空，无法回答。");
  const localSources = Array.isArray(payload.localSources) ? payload.localSources.map(normalizeSource) : [];
  const webSources = Array.isArray(payload.webSources) ? payload.webSources.map(normalizeWebSource) : [];
  if (localSources.length === 0 && webSources.length === 0) {
    return {
      ...mockAsk(question, [], []),
      sourceStatus: "local_rule",
      warnings: ["当前文件尚未生成可用正文片段，无法进行可靠回答。"],
    };
  }

  const modelJson = await callChatJson(
    [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: `请基于 sources 回答问题并返回 JSON，字段必须包含 answer,sources,webSources,confidence,warnings。\n问题：${question}\n本地来源：${JSON.stringify(localSources).slice(0, 12000)}\n网页来源：${JSON.stringify(webSources).slice(0, 6000)}\n上下文：${JSON.stringify(payload.context || {}).slice(0, 3000)}`,
      },
    ],
    0.28,
    allowMock,
  );
  if (modelJson) return normalizeAsk(modelJson);
  if (!allowMock) throw new Error("真实 AI 未返回问答结果。");
  return { ...mockAsk(question, localSources, webSources), sourceStatus: "mock" };
}

async function generateOutput(payload) {
  const type = String(payload.type || "summary");
  const context = payload.context ?? "";
  const allowMock = payload.allowMock !== false;
  const modelJson = await callChatJson(
    [
      { role: "system", content: systemPrompt() },
      {
        role: "user",
        content: `请生成指定成果并返回 JSON，字段必须包含 title,content,sources。\n成果类型：${type}\n上下文：${JSON.stringify(context).slice(0, 18000)}`,
      },
    ],
    0.34,
    allowMock,
  );
  if (modelJson) return normalizeOutput(modelJson, type);
  if (!allowMock) throw new Error("真实 AI 未返回成果生成结果。");
  return mockOutput(type, context);
}

async function searchWithTavily(config, query, retrievedAt) {
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: config.apiKey,
      query,
      search_depth: "basic",
      include_answer: false,
      max_results: 5,
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily Search API 返回 ${response.status}: ${text.slice(0, 240)}`);
  }
  const data = await response.json();
  return Array.isArray(data?.results)
    ? data.results.slice(0, 5).map((item) => ({
        title: String(item.title || "网页来源"),
        siteName: safeHost(item.url),
        url: String(item.url || ""),
        snippet: String(item.content || item.snippet || "").slice(0, 500),
        retrievedAt,
        relevance: Number.isFinite(Number(item.score)) ? Number(item.score) : undefined,
      }))
    : [];
}

async function searchWithBrave(config, query, retrievedAt) {
  const url = new URL("https://api.search.brave.com/res/v1/web/search");
  url.searchParams.set("q", query);
  url.searchParams.set("count", "5");
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-Subscription-Token": config.apiKey,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Brave Search API 返回 ${response.status}: ${text.slice(0, 240)}`);
  }
  const data = await response.json();
  return Array.isArray(data?.web?.results)
    ? data.web.results.slice(0, 5).map((item, index) => ({
        title: String(item.title || "网页来源"),
        siteName: safeHost(item.url),
        url: String(item.url || ""),
        snippet: String(item.description || item.extra_snippets?.[0] || "").slice(0, 500),
        retrievedAt,
        relevance: Number((1 - index * 0.08).toFixed(2)),
      }))
    : [];
}

async function searchWithSerpApi(config, query, retrievedAt) {
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("api_key", config.apiKey);
  url.searchParams.set("num", "5");
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SerpApi 返回 ${response.status}: ${text.slice(0, 240)}`);
  }
  const data = await response.json();
  return Array.isArray(data?.organic_results)
    ? data.organic_results.slice(0, 5).map((item, index) => ({
        title: String(item.title || "网页来源"),
        siteName: safeHost(item.link),
        url: String(item.link || ""),
        snippet: String(item.snippet || "").slice(0, 500),
        retrievedAt,
        relevance: Number((1 - index * 0.08).toFixed(2)),
      }))
    : [];
}

async function searchWeb(payload) {
  const query = String(payload.query || "").trim();
  if (!query) throw new Error("搜索问题为空。");
  const config = getSearchConfig();
  if (!config.enabled || !config.configured) {
    return {
      sources: [],
      warning: "联网搜索暂未配置，请在后端配置搜索 API。",
    };
  }

  const retrievedAt = new Date().toISOString();
  const sources =
    config.provider === "tavily"
      ? await searchWithTavily(config, query, retrievedAt)
      : config.provider === "brave"
        ? await searchWithBrave(config, query, retrievedAt)
        : config.provider === "serpapi"
          ? await searchWithSerpApi(config, query, retrievedAt)
          : [];
  return { sources, provider: config.provider };
}

function safeHost(url) {
  try {
    return new URL(String(url)).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

async function route(req, res) {
  if (req.method === "OPTIONS") {
    jsonResponse(res, 204, {});
    return;
  }
  if (req.method === "GET" && req.url === "/api/health") {
    const config = getProviderConfig();
    const search = getSearchConfig();
    jsonResponse(res, 200, {
      ok: true,
      provider: config.provider,
      model: config.model,
      search: { enabled: search.enabled, configured: search.configured, provider: search.provider },
      ocr: {
        enabled: false,
        configured: Boolean(process.env.OCR_API_KEY || process.env.OCR_PROVIDER),
        provider: process.env.OCR_PROVIDER || "none",
      },
    });
    return;
  }
  if (req.method === "GET" && req.url === "/api/auth/demo-users") {
    jsonResponse(res, 200, { users: demoUsers.map(({ password, ...user }) => user) });
    return;
  }
  if (req.method === "GET" && req.url === "/api/workspaces") {
    const user = userFromRequest(req);
    jsonResponse(res, 200, {
      workspaces: listWorkspaces().filter((workspace) => canReadWorkspace(user, workspace)),
    });
    return;
  }
  if (req.method !== "POST") {
    jsonResponse(res, 405, { error: "只支持 POST 请求。" });
    return;
  }

  try {
    const payload = await readJson(req);
    if (req.url === "/api/auth/login") {
      const username = String(payload.username || "").trim().toLowerCase();
      const password = String(payload.password || "");
      const user = demoUsers.find((item) => item.username === username || item.email === username);
      if (!user || !password.trim()) {
        jsonResponse(res, 401, { error: "Demo 登录需要输入已存在账号和任意非空密码。" });
        return;
      }
      jsonResponse(res, 200, {
        user,
        workspaces: listWorkspaces().filter((workspace) => canReadWorkspace(user, workspace)),
      });
      return;
    }
    if (req.url === "/api/ai/analyze") {
      enforceWorkspaceAccess(req, payload, "write");
      jsonResponse(res, 200, await analyze(payload));
      return;
    }
    if (req.url === "/api/ai/ask") {
      enforceWorkspaceAccess(req, payload, "read");
      jsonResponse(res, 200, await ask(payload));
      return;
    }
    if (req.url === "/api/ai/generate-output") {
      enforceWorkspaceAccess(req, payload, "write");
      jsonResponse(res, 200, await generateOutput(payload));
      return;
    }
    if (req.url === "/api/search") {
      enforceWorkspaceAccess(req, payload, "read");
      const result = await searchWeb(payload);
      jsonResponse(res, result.warning ? 501 : 200, result);
      return;
    }
    jsonResponse(res, 404, { error: "接口不存在。" });
  } catch (error) {
    console.error("[ai-proxy]", error);
    const statusCode = Number.isFinite(error?.statusCode) ? error.statusCode : 400;
    jsonResponse(res, statusCode, { error: error instanceof Error ? error.message : "AI 代理服务处理失败。" });
  }
}

createServer((req, res) => {
  void route(req, res);
}).listen(PORT, "127.0.0.1", () => {
  const config = getProviderConfig();
  const search = getSearchConfig();
  console.log(`Zhimai AI proxy listening on http://127.0.0.1:${PORT}`);
  console.log(`AI provider: ${config.provider}${config.provider === "mock" ? " (no API key detected)" : ` / ${config.model}`}`);
  console.log(`Search provider: ${search.enabled ? search.provider : "not configured"}`);
});
