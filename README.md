# OpenAPI Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/chanfana-openapi-template)

![OpenAPI Template Preview](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/91076b39-1f5b-46f6-7f14-536a6f183000/public)

<!-- dash-content-start -->

This is a Cloudflare Worker with OpenAPI 3.1 Auto Generation and Validation using [chanfana](https://github.com/cloudflare/chanfana) and [Hono](https://github.com/honojs/hono).

This is an example project made to be used as a quick start into building OpenAPI compliant Workers that generates the
`openapi.json` schema automatically from code and validates the incoming request to the defined parameters or request body.

This template includes various endpoints, a D1 database, and integration tests using [Vitest](https://vitest.dev/) as examples. In endpoints, you will find [chanfana D1 AutoEndpoints](https://chanfana.com/endpoints/auto/d1) and a [normal endpoint](https://chanfana.com/endpoints/defining-endpoints) to serve as examples for your projects.

Besides being able to see the OpenAPI schema (openapi.json) in the browser, you can also extract the schema locally no hassle by running this command `npm run schema`.

<!-- dash-content-end -->

> [!IMPORTANT]
> When using C3 to create this project, select "no" when it asks if you want to deploy. You need to follow this project's [setup steps](https://github.com/cloudflare/templates/tree/main/openapi-template#setup-steps) before deploying.

## Getting Started

Outside of this repo, you can start a new project with this template using [C3](https://developers.cloudflare.com/pages/get-started/c3/) (the `create-cloudflare` CLI):

```bash
npm create cloudflare@latest -- --template=cloudflare/templates/openapi-template
```

A live public deployment of this template is available at [https://openapi-template.templates.workers.dev](https://openapi-template.templates.workers.dev)

## Setup Steps

1. Install the project dependencies with a package manager of your choice:
   ```bash
   npm install
   ```
2. Create a [D1 database](https://developers.cloudflare.com/d1/get-started/) with the name "openapi-template-db":
   ```bash
   npx wrangler d1 create openapi-template-db
   ```
   ...and update the `database_id` field in `wrangler.json` with the new database ID.
3. Run the following db migration to initialize the database (notice the `migrations` directory in this project):
   ```bash
   npx wrangler d1 migrations apply DB --remote
   ```
4. Deploy the project!
   ```bash
   npx wrangler deploy
   ```
5. Monitor your worker
   ```bash
   npx wrangler tail
   ```

## Testing

This template includes integration tests using [Vitest](https://vitest.dev/). To run the tests locally:

```bash
npm run test
```

Test files are located in the `tests/` directory, with examples demonstrating how to test your endpoints and database interactions.

## Project structure

1. Your main router is defined in `src/index.ts`.
2. Each endpoint has its own file in `src/endpoints/`.
3. Integration tests are located in the `tests/` directory.
4. For more information read the [chanfana documentation](https://chanfana.com/), [Hono documentation](https://hono.dev/docs), and [Vitest documentation](https://vitest.dev/guide/).

## 对话 API (DeepSeek)

本项目实现了一套 DeepSeek 风格的多轮对话 API，调用 DeepSeek 对话模型（`deepseek-chat`）生成回复并持久化到 D1。

### 接口

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/conversations` | 创建对话（可选 `title`） |
| GET | `/conversations` | 对话列表 |
| GET | `/conversations/:id` | 对话详情（含消息历史） |
| DELETE | `/conversations/:id` | 删除对话（级联消息） |
| POST | `/conversations/:id/messages` | 发送消息，返回 AI 回复（核心） |
| GET | `/conversations/:id/messages` | 消息列表 |

数据库表见 `migrations/0001_init_chat.sql`：`conversations`（会话）与 `messages`（消息）。

### 环境变量

- `DEEPSEEK_BASE_URL`、`DEEPSEEK_MODEL`：在 `wrangler.jsonc` 的 `vars` 中配置。
- `DEEPSEEK_API_KEY`：本地开发写在 `.dev.vars`（已被 gitignore）；生产部署用：
  ```bash
  npx wrangler secret put DEEPSEEK_API_KEY
  ```

### 本地运行与界面测试

```bash
npm run dev            # 启动后访问 http://localhost:8787/ 打开 Swagger UI 直接测试
```

在 Swagger UI 中先 `POST /conversations` 拿到对话 `id`，再用该 `id` 调 `POST /conversations/:id/messages` 发消息即可看到 DeepSeek 回复。
