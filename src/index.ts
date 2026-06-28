import { ApiException, fromHono } from "chanfana";
import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { conversationsRouter } from "./endpoints/conversations";
import { messagesRouter } from "./endpoints/messages";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
	if (err instanceof ApiException) {
		// If it's a Chanfana ApiException, let Chanfana handle the response
		return c.json(
			{ success: false, errors: err.buildResponse() },
			err.status as ContentfulStatusCode,
		);
	}

	console.error("Global error handler caught:", err); // Log the error if it's not known

	// For other errors, return a generic 500 response
	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Setup OpenAPI registry
const openapi = fromHono(app, {
	docs_url: "/",
	schema: {
		info: {
			title: "对话 API (DeepSeek)",
			version: "1.0.0",
			description:
				"DeepSeek 风格的多轮对话 API：创建对话、在对话内发消息，后端调用 DeepSeek 模型生成回复并持久化。",
		},
	},
});

// 消息路由嵌入对话子路由，保留 /conversations/:id/messages 路径
conversationsRouter.route("/:id/messages", messagesRouter);

// 注册对话路由
openapi.route("/conversations", conversationsRouter);

// Export the Hono app
export default app;
