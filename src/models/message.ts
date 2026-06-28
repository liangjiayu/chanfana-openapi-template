import { z } from "zod";

export const messageRole = z.enum(["user", "assistant", "system"]);

// 对话内的一条消息
export const message = z.object({
	id: z.string(),
	conversation_id: z.string(),
	role: messageRole,
	content: z.string(),
	prompt_tokens: z.number().int().nullable(),
	completion_tokens: z.number().int().nullable(),
	created_at: z.string(),
});

export const MessageModel = {
	tableName: "messages",
	primaryKeys: ["id"],
	schema: message,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: message,
};
