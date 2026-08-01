# 项目上下文

## 版本技术栈

- **Framework**: TanStack Start + TanStack Router
- **Build/Server**: Vite 8 + Cloudflare Vite Plugin
- **Deploy**: Cloudflare Workers + GitHub Actions
- **Core**: React 19
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **AI 图像生成**: OpenRouter Images API，模型 `bytedance-seed/seedream-4.5`

## 项目说明

证照优化大师 — AI 驱动的专业证件照优化工具。用户上传正面人像照片，选择背景色与服装，AI 一键生成标准证件照。

### 核心功能

1. **图片上传**: 支持拖拽和点击上传，接受 JPG/PNG 格式，最大 10MB
2. **背景颜色选择**: 白色、蓝色、红色三种标准证件照背景
3. **服装选择**: 通用/男款/女款服装选项
4. **AI 证件照生成**: 使用 `bytedance-seed/seedream-4.5`，`3:4`、`4K` 输出

## 目录结构

```text
├── public/                 # 静态资源
├── src/
│   ├── routes/             # TanStack Start 文件路由
│   │   ├── __root.tsx      # 根文档、HeadContent、Scripts
│   │   ├── index.tsx       # 主页面
│   │   └── api/optimize.ts # POST /api/optimize
│   ├── components/         # 业务组件
│   ├── lib/                # 工具库
│   │   ├── seedream.server.ts # OpenRouter Seedream API，仅服务端导入
│   │   └── prompt.ts
│   ├── styles/globals.css  # 全局样式
│   ├── types/index.ts
│   └── router.tsx          # Router factory
├── vite.config.ts
├── wrangler.jsonc          # Cloudflare Workers 配置
├── .github/workflows/      # GitHub Actions 自动部署
├── package.json
└── tsconfig.json
```

## 包管理规范

- 仅允许使用 pnpm，禁止 npm/yarn。
- 修改依赖后必须更新 `pnpm-lock.yaml`。

常用命令：

```bash
pnpm install
pnpm run dev
pnpm run build
pnpm run start
pnpm run validate
pnpm run deploy
```

## TanStack Start 开发规范

- 页面使用 `src/routes` 文件路由，不创建 `src/app`、`pages` 或 Next.js route handler。
- 根文档在 `src/routes/__root.tsx` 中维护，必须保留 `<HeadContent />` 和 `<Scripts />`。
- 普通 React 组件不需要 `"use client"` / `"use server"` 指令。
- 服务端敏感逻辑必须放在 `.server.ts` 或 TanStack Start server route/server function 后面。
- 不要手动编辑 `src/routeTree.gen.ts`；通过 dev/build 自动生成。

## AI 图像生成 API 规范

- 使用 OpenRouter 图像接口：`POST https://openrouter.ai/api/v1/images`。
- 仅在服务端读取环境变量 `OPENROUTER_API_KEY`。
- 固定模型：`bytedance-seed/seedream-4.5`。
- 固定输出：`aspect_ratio: "3:4"`、`resolution: "4K"`、`n: 1`，并将 Base64 结果转换为 data URL。
- 前端和外部调用仍使用 `POST /api/optimize`。
- Cloudflare 线上运行时用 `pnpm wrangler secret put OPENROUTER_API_KEY` 设置 Worker Secret。
- GitHub Actions 部署凭据只放仓库 Secrets：`CLOUDFLARE_ACCOUNT_ID`、`CLOUDFLARE_API_TOKEN`。

### POST /api/optimize

请求体：

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

## 验证要求

- 迁移路由、服务端边界、依赖或配置后运行：

```bash
pnpm run typecheck
pnpm run lint:build
pnpm run build
```

- 修改公开接口、环境变量或部署脚本时，同步更新 README/AGENTS。
