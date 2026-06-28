import { ApiException } from "chanfana";

export type ChatMessage = { role: string; content: string };

export type ChatCompletionResult = {
	content: string;
	usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
};

// 上游 DeepSeek 调用失败时抛出的异常（被全局错误处理器捕获，返回 502）
class DeepSeekException extends ApiException {
	public isVisible = true;
	public default_message = "DeepSeek upstream error";
	public status = 502;
	public code = 8000;
}

/**
 * 调用 DeepSeek 对话补全接口（OpenAI 兼容，阻塞式 / 非流式）。
 * 端点：POST {DEEPSEEK_BASE_URL}/chat/completions
 */
export async function chatCompletion(
	env: Env,
	messages: ChatMessage[],
): Promise<ChatCompletionResult> {
	const res = await fetch(`${env.DEEPSEEK_BASE_URL}/chat/completions`, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: env.DEEPSEEK_MODEL,
			messages,
			stream: false,
		}),
	});

	if (!res.ok) {
		const detail = await res.text();
		console.error("DeepSeek API error:", res.status, detail);
		throw new DeepSeekException(`DeepSeek 请求失败 (${res.status})`);
	}

	const data = (await res.json()) as {
		choices: { message: { content: string } }[];
		usage: ChatCompletionResult["usage"];
	};

	const content = data.choices?.[0]?.message?.content;
	if (typeof content !== "string") {
		throw new DeepSeekException("DeepSeek 返回内容为空");
	}

	return { content, usage: data.usage };
}
