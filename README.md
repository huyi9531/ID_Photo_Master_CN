# 证照优化大师

基于 TanStack Start + Vite + Nitro 的证件照优化工具。用户上传正面人像，选择背景色和服装后，后端直连火山方舟官方 Images API 生成标准证件照。

## 技术栈

- TanStack Start / TanStack Router
- React 19 + TypeScript 5
- Vite 8 + Cloudflare Vite Plugin
- Tailwind CSS 4 + shadcn/ui
- 火山方舟官方生图 API：`doubao-seedream-4-5-251128`

## 环境变量

服务端生图接口需要配置以下任一变量：

```bash
ARK_API_KEY=你的火山方舟 API Key
# 或
VOLCENGINE_API_KEY=你的火山方舟 API Key
# 兼容旧部署，也可用
IMAGE_API_KEY=你的火山方舟 API Key
```

密钥只在 `src/lib/seedream.server.ts` 中读取，不会进入客户端 bundle。

部署到 Cloudflare Workers 时，推荐把 `ARK_API_KEY` 设置为 Worker Secret；当前也兼容已有的 `IMAGE_API_KEY`：

```bash
pnpm wrangler secret put ARK_API_KEY
```

GitHub Actions 自动部署还需要在 GitHub repository secrets 中配置：

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

配置完成后，每次推送到 `main` 分支都会自动执行构建并部署到 Cloudflare Workers。

## 快速开始

```bash
pnpm install
pnpm run dev
```

默认开发地址：

```text
http://localhost:5000
```

## 常用命令

```bash
pnpm run dev        # 启动 TanStack Start 开发服务器
pnpm run build      # 构建 Vite + Nitro 产物
pnpm run start      # 使用 vite preview 预览 Cloudflare Worker 构建
pnpm run typecheck  # TypeScript 检查
pnpm run lint:build # ESLint 检查
pnpm run validate   # 并行运行 typecheck 和 lint
pnpm run deploy     # 构建并部署到 Cloudflare Workers
```

## 项目结构

```text
src/
├── routes/
│   ├── __root.tsx        # 根文档、HeadContent、Scripts
│   ├── index.tsx         # 主页面
│   └── api/optimize.ts   # POST /api/optimize
├── components/           # 业务组件与 shadcn/ui
├── hooks/
├── lib/
│   ├── seedream.server.ts # 火山方舟官方 API 调用
│   ├── clothing-data.ts
│   ├── prompt.ts
│   └── utils.ts
├── styles/globals.css
├── types/index.ts
└── router.tsx
```

## API

### POST /api/optimize

请求：

```json
{
  "imageBase64": "data:image/...;base64,...",
  "prompt": "证件照生成 prompt"
}
```

成功响应：

```json
{
  "resultImageUrl": "https://..."
}
```

错误响应：

```json
{
  "error": "错误信息"
}
```

## 开发注意

- 使用 `src/routes` 文件路由，不使用 Next.js `src/app`。
- 不要手动修改 `src/routeTree.gen.ts`，它由 TanStack Start 自动生成。
- 服务端密钥、官方 API 调用、文件系统或其他敏感逻辑必须放在 `.server.ts` 或 server route 中。
- 新增依赖前先全局检索是否已有可复用实现。
- Cloudflare Worker 名称在 `wrangler.jsonc` 的 `name` 字段中配置；当前为 `id-photo-master-cn`。
