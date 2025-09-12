// ===================== 仅需改这里（1/2）—— 联盟链接列表 =====================
// 支持：数组（推荐）或用换行/逗号/竖线分隔的字符串
const B_URLS = [
  // 示例：
  "http://discoverdestinations.it.com/",
  "https://kiwi.tpk.mx/c3p3hsnR"
];

// ===================== 仅需改这里（2/2）—— Referer 配置 =====================
// 三种写法，任选一种：
//
// ① 全局一个 Referer（所有链接统一使用）：
const B_REFERERS = "https://your.site/landing-a";
//
// ② 与 B_URLS 一一对应（下标对齐；空串 "" 表示不发送 Referer）：
// const B_REFERERS = ["https://your.site/landing-a", ""];
//
// ③ 按域名映射（未匹配到则回退浏览器 Referer 或不发）：
// const B_REFERERS = { "net1.example": "https://your.site/a", "net2.example": "https://your.site/b", "*": "" };
// const B_REFERERS = ""; // <- 默认空，表示回退浏览器 Referer（或不发）

// =============== 可选：高级选项（需要再改就改，不改也可直接用） ===============
const TIMEOUT_MS = 2500;      // 单个上报请求超时（毫秒）
const TRIGGER_ON_ROOT = true; // 访问根路径时，在服务端后台并发触发上报
// ============================================================================

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    // ① 独立上报路由（推荐：前端页面加载后 sendBeacon('/track?...') 触发）
    if (url.pathname === "/track") {
      const params  = collectAttributionParams(url);
      const targets = toTargets(B_URLS, params);
      const refCfg  = parseReferers(B_REFERERS);

      fireAll(targets, refCfg, req, params, ctx);
      return new Response(null, { status: 204 });
    }

    // ② 访问落地页时，服务端后台并发触发（不阻塞首屏）
    if (TRIGGER_ON_ROOT && (url.pathname === "/" || url.pathname === "/index.html")) {
      const params  = collectAttributionParams(url);
      const targets = toTargets(B_URLS, params);
      const refCfg  = parseReferers(B_REFERERS);
      fireAll(targets, refCfg, req, params, ctx);
    }

    // ③ 回源到 Pages 静态资源（如果不是 Pages 运行环境，则返回 200）
    if (env?.ASSETS?.fetch) return env.ASSETS.fetch(req);
    return new Response("OK", { status: 200 });
  }
};

/** 并行触发所有 b 链接（不阻塞响应） */
function fireAll(targets, refCfg, req, params, ctx) {
  if (!targets.length) return;
  const browserRef = req.headers.get("Referer") || undefined;

  const jobs = targets.map((t, i) => {
    const ref = pickRefererFor(t, i, refCfg, browserRef);
    const ac  = new AbortController();
    const tid = setTimeout(() => ac.abort("timeout"), TIMEOUT_MS);

    return fetch(t, {
      method: "GET",
      redirect: "manual",
      headers: ref ? { Referer: ref } : {},
      signal: ac.signal
    }).catch(() => null).finally(() => clearTimeout(tid));
  });

  ctx.waitUntil(Promise.allSettled(jobs));
}

/** 解析 B_URLS（数组 / 换行|逗号|竖线分隔），并把缺失的归因参数补上 */
function toTargets(raw, params) {
  const list = normalizeList(raw);
  if (!list.length) return [];

  const uniq = Array.from(new Set(list));
  return uniq.map(s => {
    const u = new URL(s);
    for (const [k, v] of Object.entries(params)) {
      if (!v) continue;
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    }
    return u.toString();
  });
}

/** 解析 B_REFERERS：支持字符串（全局）、数组（对位）、对象（域名映射） */
function parseReferers(raw) {
  if (raw == null) return null;

  // JSON 友好解析
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (!trimmed) return ""; // 空串：全局空 Referer（即不发）
    try {
      const maybe = JSON.parse(trimmed);
      if (Array.isArray(maybe) || typeof maybe === "object") return maybe;
      if (typeof maybe === "string") return maybe;
      // 其他情况继续当作“分隔字符串”
    } catch {
      // 非 JSON，继续走分隔字符串逻辑
    }
    const list = splitList(trimmed);
    return list.length === 1 ? list[0] : list;
  }

  // 已经是数组或对象
  if (Array.isArray(raw) || typeof raw === "object") return raw;

  return null;
}

/** 针对单个目标选择要发送的 Referer */
function pickRefererFor(targetUrl, index, refCfg, browserRef) {
  // 0) 未配置 -> 回退浏览器 Referer
  if (refCfg == null) return browserRef || undefined;

  // 1) 全局一个：字符串（允许空串表示不发）
  if (typeof refCfg === "string") return refCfg || undefined;

  // 2) 域名映射：对象（允许设置 "*" 兜底；值为空串表示不发）
  if (!Array.isArray(refCfg)) {
    try {
      const host = new URL(targetUrl).hostname;
      if (Object.prototype.hasOwnProperty.call(refCfg, host)) return refCfg[host] || undefined;
      if (Object.prototype.hasOwnProperty.call(refCfg, "*"))   return refCfg["*"] || undefined;
    } catch { /* ignore */ }
    return browserRef || undefined;
  }

  // 3) 一一对应：数组（长度为 1 则视为全局）
  if (refCfg.length === 1) return refCfg[0] || undefined;
  if (index < refCfg.length) return refCfg[index] || undefined;

  // 不够长：回退浏览器 Referer
  return browserRef || undefined;
}

/** 收集归因参数（有就带上）：gclid / gbraid / wbraid / utm_* / sub_id */
function collectAttributionParams(url) {
  const sp = url.searchParams;
  const g = sp.get("gclid") || sp.get("gbraid") || sp.get("wbraid") || "";
  const utmKeys = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"];
  const utm = utmKeys.reduce((o,k)=> (sp.get(k) ? (o[k]=sp.get(k),o) : o), {});
  const sub_id = sp.get("sub_id") || crypto.randomUUID();
  return { gclid: g, sub_id, ...utm };
}

/** 工具：把“数组 / 分隔字符串”统一成数组 */
function normalizeList(raw) {
  if (Array.isArray(raw)) return raw.map(String).map(s=>s.trim()).filter(Boolean);
  if (typeof raw === "string") {
    try {
      const maybe = JSON.parse(raw);
      if (Array.isArray(maybe)) return maybe.map(String).map(s=>s.trim()).filter(Boolean);
    } catch { /* ignore */ }
    return splitList(raw);
  }
  return [];
}

/** 工具：支持换行 / 逗号 / 竖线分隔 */
function splitList(raw) {
  return String(raw)
    .split(/[\n,\|]/)
    .map(s => s.trim())
    .filter(Boolean);
}



