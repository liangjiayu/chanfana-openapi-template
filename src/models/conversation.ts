import { z } from "zod";

// 对话会话
export const conversation = z.object({
	id: z.string(),
	title: z.string(),
	model: z.string(),
	created_at: z.string(),
	updated_at: z.string(),
});

export const ConversationModel = {
	tableName: "conversations",
	primaryKeys: ["id"],
	schema: conversation,
	serializer: (obj: Record<string, string | number | boolean>) => obj,
	serializerObject: conversation,
};
