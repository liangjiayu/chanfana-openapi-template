import { SELF } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const BASE = "http://local.test";

async function createConversation(title?: string) {
	const response = await SELF.fetch(`${BASE}/conversations`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(title ? { title } : {}),
	});
	const body = await response.json<{ success: boolean; result: { id: string; title: string } }>();
	return { response, body };
}

describe("Conversation API Integration Tests", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /conversations", () => {
		it("创建对话，返回带 id 的记录", async () => {
			const { response, body } = await createConversation("我的对话");
			expect(response.status).toBe(201);
			expect(body.success).toBe(true);
			expect(body.result.id).toEqual(expect.any(String));
			expect(body.result.title).toBe("我的对话");
		});

		it("不传 title 时使用默认标题", async () => {
			const { body } = await createConversation();
			expect(body.result.title).toBe("新对话");
		});
	});

	describe("GET /conversations", () => {
		it("空列表", async () => {
			const response = await SELF.fetch(`${BASE}/conversations`);
			const body = await response.json<{ success: boolean; result: any[] }>();
			expect(response.status).toBe(200);
			expect(body.result).toEqual([]);
		});

		it("创建后能在列表中查到", async () => {
			await createConversation("列表测试");
			const response = await SELF.fetch(`${BASE}/conversations`);
			const body = await response.json<{ success: boolean; result: any[] }>();
			expect(body.result.length).toBe(1);
			expect(body.result[0].title).toBe("列表测试");
		});
	});

	describe("GET /conversations/:id", () => {
		it("返回对话及空消息历史", async () => {
			const { body: created } = await createConversation();
			const response = await SELF.fetch(`${BASE}/conversations/${created.result.id}`);
			const body = await response.json<{ success: boolean; result: any }>();
			expect(response.status).toBe(200);
			expect(body.result.id).toBe(created.result.id);
			expect(body.result.messages).toEqual([]);
		});

		it("不存在的对话返回 404", async () => {
			const response = await SELF.fetch(`${BASE}/conversations/not-exist`);
			expect(response.status).toBe(404);
		});
	});

	describe("DELETE /conversations/:id", () => {
		it("删除对话后列表为空", async () => {
			const { body: created } = await createConversation();
			const del = await SELF.fetch(`${BASE}/conversations/${created.result.id}`, {
				method: "DELETE",
			});
			expect(del.status).toBe(200);

			const list = await SELF.fetch(`${BASE}/conversations`);
			const body = await list.json<{ result: any[] }>();
			expect(body.result).toEqual([]);
		});
	});

	describe("GET /conversations/:id/messages", () => {
		it("新对话消息为空", async () => {
			const { body: created } = await createConversation();
			const response = await SELF.fetch(`${BASE}/conversations/${created.result.id}/messages`);
			const body = await response.json<{ success: boolean; result: any[] }>();
			expect(response.status).toBe(200);
			expect(body.result).toEqual([]);
		});
	});
});
