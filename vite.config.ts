import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { promises as fsPromises } from "fs";
import { IncomingMessage } from "http";
import { componentTagger } from "lovable-tagger";

const createContentApiMiddleware = () => {
  const CONTENT_DIR = path.resolve(__dirname, "public/content/pages");

  const ensureDir = async () => {
    await fsPromises.mkdir(CONTENT_DIR, { recursive: true });
  };

  const sanitizeSlug = (slug: string) =>
    slug
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const getFilePath = (slug: string) => path.join(CONTENT_DIR, `${slug}.md`);

  const readBody = async (req: IncomingMessage) =>
    await new Promise<string>((resolve, reject) => {
      let data = "";
      req.on("data", (chunk) => {
        data += chunk;
      });
      req.on("end", () => resolve(data));
      req.on("error", reject);
    });

  return async (req: IncomingMessage, res: any, next: () => void) => {
    if (!req.url || !req.url.startsWith("/api/content/pages")) {
      return next();
    }

    try {
      await ensureDir();
      const url = new URL(req.url, "http://localhost");
      const slugFromPath = url.pathname.replace("/api/content/pages", "").replace(/^\//, "");

      if (req.method === "GET") {
        if (!slugFromPath) {
          res.statusCode = 400;
          res.end("Slug is required");
          return;
        }

        const filePath = getFilePath(sanitizeSlug(slugFromPath));
        try {
          const content = await fsPromises.readFile(filePath, "utf-8");
          res.setHeader("Content-Type", "text/markdown");
          res.end(content);
        } catch (error: any) {
          res.statusCode = error.code === "ENOENT" ? 404 : 500;
          res.end(error.code === "ENOENT" ? "Markdown file not found" : "Failed to read markdown file");
        }
        return;
      }

      if (req.method === "POST") {
        const rawBody = await readBody(req);
        let payload: any = {};
        if (rawBody) {
          payload = JSON.parse(rawBody);
        }
        const slug = sanitizeSlug(payload.slug || "");
        if (!slug) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Invalid slug" }));
          return;
        }
        const filePath = getFilePath(slug);
        if (fs.existsSync(filePath)) {
          res.statusCode = 409;
          res.end(JSON.stringify({ error: "Markdown file already exists" }));
          return;
        }
        const content = payload.content || `# ${payload.title || slug}\n\nStart writing here...`;
        await fsPromises.writeFile(filePath, content, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ slug }));
        return;
      }

      if (req.method === "PUT") {
        if (!slugFromPath) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Slug is required" }));
          return;
        }
        const slug = sanitizeSlug(slugFromPath);
        const filePath = getFilePath(slug);
        const rawBody = await readBody(req);
        const payload = rawBody ? JSON.parse(rawBody) : {};
        if (typeof payload.content !== "string") {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "content is required" }));
          return;
        }
        await fsPromises.writeFile(filePath, payload.content, "utf-8");
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ slug }));
        return;
      }

      if (req.method === "DELETE") {
        if (!slugFromPath) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Slug is required" }));
          return;
        }
        const slug = sanitizeSlug(slugFromPath);
        const filePath = getFilePath(slug);
        try {
          await fsPromises.unlink(filePath);
        } catch (error: any) {
          if (error.code !== "ENOENT") {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Failed to delete markdown file" }));
            return;
          }
        }
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ slug }));
        return;
      }

      res.statusCode = 405;
      res.end("Method not allowed");
    } catch (error: any) {
      res.statusCode = 500;
      res.end(error?.message || "Content API error");
    }
  };
};

const contentApiPlugin = () => ({
  name: "local-content-api",
  configureServer(server) {
    server.middlewares.use(createContentApiMiddleware());
  },
  configurePreviewServer(server) {
    server.middlewares.use(createContentApiMiddleware());
  },
});

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), contentApiPlugin(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
