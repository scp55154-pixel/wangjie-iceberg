/* 本地静态服务器：只用 Node 内置模块，不安装依赖。 */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8790);
const HOST = "127.0.0.1";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2"
};

const server = http.createServer((req, res) => {
  try {
    const parsed = new URL(req.url, `http://${HOST}:${PORT}`);
    let pathname = decodeURIComponent(parsed.pathname);
    if (pathname === "/") pathname = "/index.html";

    const filePath = path.resolve(ROOT, "." + pathname);
    const inside = filePath === ROOT || filePath.startsWith(ROOT + path.sep);
    if (!inside) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    fs.stat(filePath, (statError, stat) => {
      if (statError || !stat.isFile()) {
        res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
        res.end("<!doctype html><meta charset=\"utf-8\"><title>404</title><p style=\"font:16px sans-serif;padding:40px;background:#04090d;color:#e8f6fa\">404 · 这一层没有档案。<a style=\"color:#9fe8ff\" href=\"/\">回到水面</a></p>");
        return;
      }
      const type = MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream";
      res.writeHead(200, {
        "Content-Type": type,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      });
      fs.createReadStream(filePath).pipe(res);
    });
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("500 · 服务器错误");
  }
});

server.listen(PORT, HOST, () => {
  console.log(`The Camp Iceberg running at http://${HOST}:${PORT}/`);
});
