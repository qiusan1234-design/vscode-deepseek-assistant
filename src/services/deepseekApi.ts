import * as vscode from 'vscode';

export interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface DeepSeekResponse {
  id: string;
  choices: {
    index: number;
    message: DeepSeekMessage;
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner' | 'deepseek-coder';

const MODEL_DISPLAY: Record<DeepSeekModel, string> = {
  'deepseek-chat': 'DeepSeek-V4-Pro',
  'deepseek-reasoner': 'DeepSeek-R1',
  'deepseek-coder': 'DeepSeek-Coder'
};

export function getModelDisplayName(model: DeepSeekModel): string {
  return MODEL_DISPLAY[model] || model;
}

export function getAvailableModels(): { id: DeepSeekModel; name: string }[] {
  return [
    { id: 'deepseek-chat', name: 'DeepSeek-V4-Pro' },
    { id: 'deepseek-reasoner', name: 'DeepSeek-R1' },
    { id: 'deepseek-coder', name: 'DeepSeek-Coder' }
  ];
}

export class DeepSeekService {
  private getConfig() {
    const config = vscode.workspace.getConfiguration('deepseek');
    const apiKey = config.get<string>('apiKey', '');
    const baseUrl = config.get<string>('baseUrl', 'https://api.deepseek.com');
    const defaultModel = config.get<string>('defaultModel', 'deepseek-chat') as DeepSeekModel;
    const maxTokens = config.get<number>('maxTokens', 4096);
    const temperature = config.get<number>('temperature', 0.7);

    return { apiKey, baseUrl, defaultModel, maxTokens, temperature };
  }

  private ensureApiKey(): string {
    const { apiKey } = this.getConfig();
    if (!apiKey) {
      throw new Error(
        'DeepSeek API Key not configured. Go to Settings > Extensions > DeepSeek Assistant, ' +
        'or use command "DeepSeek: Configure API Key". Get your key at https://platform.deepseek.com/api_keys'
      );
    }
    return apiKey;
  }

  async chat(
    messages: DeepSeekMessage[],
    model?: DeepSeekModel,
    options?: { stream?: boolean; onToken?: (token: string) => void }
  ): Promise<string> {
    const apiKey = this.ensureApiKey();
    const config = this.getConfig();
    const useModel = model || config.defaultModel;
    const baseUrl = config.baseUrl.replace(/\/$/, '');

    const body = JSON.stringify({
      model: useModel,
      messages,
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      stream: options?.stream || false
    });

    if (options?.stream) {
      return this.chatStream(apiKey, baseUrl, body, options.onToken!);
    }

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
    }

    const data = (await response.json()) as DeepSeekResponse;
    return data.choices[0]?.message?.content || '';
  }

  private async chatStream(
    apiKey: string,
    baseUrl: string,
    body: string,
    onToken: (token: string) => void
  ): Promise<string> {
    const streamBody = JSON.stringify({ ...JSON.parse(body), stream: true });

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: streamBody
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`DeepSeek API Error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Response body is not readable');
    }

    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) { break; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) { continue; }

        const dataStr = trimmed.slice(6);
        if (dataStr === '[DONE]') { continue; }

        try {
          const parsed = JSON.parse(dataStr);
          const delta = parsed.choices?.[0]?.delta?.content;
          if (delta) {
            fullContent += delta;
            onToken(delta);
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    return fullContent;
  }
}
