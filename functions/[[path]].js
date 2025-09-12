// functions/[[path]].js
export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);

  /* 示例：affiliate 跳转 */
  if (url.pathname === '/affiliate.html' && url.searchParams.get('travel') === 'kiwi') {
    const uuid = crypto.randomUUID();
    return Response.redirect(`https://kiwi.tpk.mx/c3p3hsnR?utm_id=${uuid}`, 302);
  }

  /* 默认回源静态文件 */
  return next();
}
