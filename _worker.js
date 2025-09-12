export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);

    // ① 独立上报路由：前端可在页面加载后 fetch('/track?...') 触发
    if (url.pathname === "/track") {
      const params = collectAttributionParams(url);             // gclid、gbraid、wbraid、utm_xxx、sub_id等
      const referer = req.headers.get("Referer") || undefined;  // 可作为S2S Referer传给b

      const targets = toTargets(env.B_URLS, params);            // 解析B_URLS并补齐参数
      const jobs = targets.map(t =>
        fetch(t, { method: "GET", redirect: "manual", headers: referer ? { Referer: referer } : {} })
          .catch(() => null)                                    // 吃掉单个失败，避免整体报错
      );

      ctx.waitUntil(Promise.allSettled(jobs));                  // 不阻塞响应
      return new Response(null, { status: 204 });               // 轻量返回
    }

    // ② 落地页直达：用户命中根路径时，服务端也可自动并行触发（如需）
    if (url.pathname === "/" || url.pathname === "/index.html") {
      const params = collectAttributionParams(url);
      const referer = req.headers.get("Referer") || undefined;
      const targets = toTargets(env.B_URLS, params);
      const jobs = targets.map(t =>
        fetch(t, { method: "GET", redirect: "manual", headers: referer ? { Referer: referer } : {} })
          .catch(() => null)
      );
      ctx.waitUntil(Promise.allSettled(jobs));
    }

    // ③ 回源到 Pages 静态资源
    return env.ASSETS.fetch(req);
  }
}

/** 从落地页URL摘取归因参数；没有sub_id则生成一个 */
function collectAttributionParams(url) {
  const sp = url.searchParams;
  const gclid  = sp.get("gclid")  || sp.get("gbraid") || sp.get("wbraid") || "";
  const utm    = ["utm_source","utm_medium","utm_campaign","utm_term","utm_content"]
                  .reduce((o,k)=> (sp.get(k) ? (o[k]=sp.get(k),o) : o), {});
  const sub_id = sp.get("sub_id") || crypto.randomUUID();
  return { gclid, sub_id, ...utm };
}

/** 解析 env.B_URLS（JSON数组 / 逗号|竖线|换行分隔），并把缺失的参数补上 */
function toTargets(raw, params) {
  if (!raw) return [];
  let list = [];
  try {
    const maybe = JSON.parse(raw);
    if (Array.isArray(maybe)) list = maybe;
  } catch { /* 不是JSON就当分隔串 */ }
  if (!list.length) list = String(raw).split(/[\n,\|]/).map(s=>s.trim()).filter(Boolean);

  // 去重（按URL字符串）
  const uniq = Array.from(new Set(list));
  // 对每个URL补参（若原URL已带则尊重原值）
  return uniq.map(s => {
    const u = new URL(s);
    for (const [k,v] of Object.entries(params)) {
      if (!v) continue;
      if (!u.searchParams.has(k)) u.searchParams.set(k, v);
    }
    return u.toString();
  });
}
