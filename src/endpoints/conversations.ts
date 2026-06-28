import { Hono } from "hono";
import {
	contentJson,
	D1ListEndpoint,
	fromHono,
	NotFoundException,
	OpenAPIRoute,
} from "chanfana";
import { z } from "zod";
import { AppContext } from "../types";
import { conversation, ConversationModel } from "../models/conversation";
import { message } from "../models/message";

// POST /conversations —— 创建一个新对话
export class ConversationCreate extends OpenAPIRoute {
	public schema = {
		tags: ["Conversations"],
		summary: "创建对话",
		request: {
			body: contentJson(
				z.object({
					title: z.string().optional().openapi({ example: "新对话" }),
				}),
			),
		},
		responses: {
			"201": {
				description: "创建成功，返回对话记录",
				...contentJson(z.object({ success: z.literal(true), result: conversation })),
			},
		},
	};

	public async handle(c: AppContext) {
		const data = await this.getValidatedData<typeof this.schema>();
		const id = crypto.randomUUID();
		const title = data.body.title?.trim() || "新对话";

		const row = await c.env.DB.prepare(
			`INSERT INTO conversations (id, title, model) VALUES (?, ?, ?) RETURNING *`,
		)
			.bind(id, title, c.env.DEEPSEEK_MODEL)
			.first();

		return c.json({ success: true, result: row }, 201);
	}
}

// GET /conversations —— 对话列表
export class ConversationList extends D1ListEndpoint<[AppContext]> {
	_meta = { model: ConversationModel };
	searchFields = ["title"];
	defaultOrderBy = "updated_at DESC";
}

// GET /conversations/:id —— 对话详情（含消息历史）
export class ConversationRead extends OpenAPIRoute {
	public schema = {
		tags: ["Conversations"],
		summary: "对话详情（含消息历史）",
		request: {
			params: z.object({ id: z.string() }),
		},
		responses: {
			"200": {
				description: "返回对话及其消息历史",
				...contentJson(
					z.object({
						success: z.literal(true),
						result: conversation.extend({ messages: z.array(message) }),
					}),
				),
			},
		},
	};

	public async handle(c: AppContext) {
		const { params } = await this.getValidatedData<typeof this.schema>();

		const conv = await c.env.DB.prepare(`SELECT * FROM conversations WHERE id = ?`)
			.bind(params.id)
			.first();
		if (!conv) throw new NotFoundException("对话不存在");

		const { results } = await c.env.DB.prepare(
			`SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC, id ASC`,
		)
			.bind(params.id)
			.all();

		return { success: true, result: { ...conv, messages: results } };
	}
}

// DELETE /conversations/:id —— 删除对话（同时删除其消息）
export class ConversationDelete extends OpenAPIRoute {
	public schema = {
		tags: ["Conversations"],
		summary: "删除对话",
		request: {
			params: z.object({ id: z.string() }),
		},
		responses: {
			"200": {
				description: "删除成功",
				...contentJson(
					z.object({ success: z.literal(true), result: z.object({ id: z.string() }) }),
				),
			},
		},
	};

	public async handle(c: AppContext) {
		const { params } = await this.getValidatedData<typeof this.schema>();

		const conv = await c.env.DB.prepare(`SELECT id FROM conversations WHERE id = ?`)
			.bind(params.id)
			.first();
		if (!conv) throw new NotFoundException("对话不存在");

		// 显式删除消息再删对话（D1 默认不强制外键级联）
		await c.env.DB.batch([
			c.env.DB.prepare(`DELETE FROM messages WHERE conversation_id = ?`).bind(params.id),
			c.env.DB.prepare(`DELETE FROM conversations WHERE id = ?`).bind(params.id),
		]);

		return { success: true, result: { id: params.id } };
	}
}

export const conversationsRouter = fromHono(new Hono());
conversationsRouter.post("/", ConversationCreate);
conversationsRouter.get("/", ConversationList);
conversationsRouter.get("/:id", ConversationRead);
conversationsRouter.delete("/:id", ConversationDelete);
