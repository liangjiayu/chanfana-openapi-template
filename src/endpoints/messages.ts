import { Hono } from "hono";
import { contentJson, fromHono, NotFoundException, OpenAPIRoute } from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";
import { message } from "../models/message";
import { ChatMessage, chatCompletion } from "../services/deepseek";

// GET /conversations/:id/messages —— 某对话的消息列表
export class MessageList extends OpenAPIRoute {
	public schema = {
		tags: ["Messages"],
		summary: "消息列表",
		request: {
			params: z.object({ id: z.string() }),
		},
		responses: {
			"200": {
				description: "返回该对话的全部消息",
				...contentJson(z.object({ success: z.literal(true), result: z.array(message) })),
			},
		},
	};

	public async handle(c: AppContext) {
		const { params } = await this.getValidatedData<typeof this.schema>();

		const conv = await c.env.DB.prepare(`SELECT id FROM conversations WHERE id = ?`)
			.bind(params.id)
			.first();
		if (!conv) throw new NotFoundException("对话不存在");

		const { results } = await c.env.DB.prepare(
			`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
		)
			.bind(params.id)
			.all();

		return { success: true, result: results };
	}
}

// POST /conversations/:id/messages —— 发消息并获取 DeepSeek 回复（核心）
export class MessageCreate extends OpenAPIRoute {
	public schema = {
		tags: ["Messages"],
		summary: "发送消息并获取 AI 回复",
		request: {
			params: z.object({ id: z.string() }),
			body: contentJson(
				z.object({
					content: z.string().min(1).openapi({ example: "你好，用一句话介绍你自己" }),
				}),
			),
		},
		responses: {
			"200": {
				description: "返回用户消息与 AI 回复",
				...contentJson(
					z.object({
						success: z.literal(true),
						result: z.object({
							conversation_id: z.string(),
							user_message: message,
							assistant_message: message,
							usage: z.object({
								prompt_tokens: z.number(),
								completion_tokens: z.number(),
								total_tokens: z.number(),
							}),
						}),
					}),
				),
			},
		},
	};

	public async handle(c: AppContext) {
		const { params, body } = await this.getValidatedData<typeof this.schema>();
		const db = c.env.DB;

		// 1. 校验对话存在
		const conv = await db
			.prepare(`SELECT * FROM conversations WHERE id = ?`)
			.bind(params.id)
			.first<{ id: string; title: string }>();
		if (!conv) throw new NotFoundException("对话不存在");

		// 2. 写入用户消息
		const userMsg = await db
			.prepare(
				`INSERT INTO messages (id, conversation_id, role, content) VALUES (?, ?, 'user', ?) RETURNING *`,
			)
			.bind(crypto.randomUUID(), params.id, body.content)
			.first();

		// 3. 读取全部历史（含刚写入的用户消息），组装成模型输入
		const { results: history } = await db
			.prepare(
				`SELECT role, content FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
			)
			.bind(params.id)
			.all<ChatMessage>();

		// 4. 调用 DeepSeek 对话模型
		const { content, usage } = await chatCompletion(c.env, history);

		// 5. 写入 assistant 回复（含 token 用量），并更新对话时间
		const assistantMsg = await db
			.prepare(
				`INSERT INTO messages (id, conversation_id, role, content, prompt_tokens, completion_tokens)
				 VALUES (?, ?, 'assistant', ?, ?, ?) RETURNING *`,
			)
			.bind(
				crypto.randomUUID(),
				params.id,
				content,
				usage?.prompt_tokens ?? null,
				usage?.completion_tokens ?? null,
			)
			.first();

		// 6. 若仍是默认标题，用首条用户消息自动命名（DeepSeek 行为）
		const newTitle = conv.title === "新对话" ? body.content.slice(0, 20) : conv.title;
		await db
			.prepare(`UPDATE conversations SET updated_at = CURRENT_TIMESTAMP, title = ? WHERE id = ?`)
			.bind(newTitle, params.id)
			.run();

		return {
			success: true,
			result: {
				conversation_id: params.id,
				user_message: userMsg,
				assistant_message: assistantMsg,
				usage,
			},
		};
	}
}

export const messagesRouter = fromHono(new Hono());
messagesRouter.get("/", MessageList);
messagesRouter.post("/", MessageCreate);
