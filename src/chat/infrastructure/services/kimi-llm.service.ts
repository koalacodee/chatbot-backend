import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Message } from 'src/chat/domain/entities/message.entity';
import { LLMService } from 'src/chat/domain/services/llm.service';
import { SearchKnowledgeChunksUseCase } from 'src/knowledge-chunks/application/use-cases';

interface KimiMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class KimiLLMService implements LLMService {
  private readonly TOOLS_MAP: Record<
    string,
    (...args: unknown[]) => Promise<unknown>
  >;
  private readonly TOOLS: [
    {
      type: 'function';
      function: {
        name: 'search';
        description: "Search Knowledge Base when your knowledge can't answer the user's question.";
        parameters: {
          type: 'object';
          required: ['query'];
          properties: {
            query: {
              type: 'string';
              description: "User's query to search for.";
            };
          };
        };
      };
    },
  ];
  private readonly BASE_DATA: Record<string, unknown>;
  private readonly SYSTEM_MESSAGE;
  constructor(
    private readonly searchUseCase: SearchKnowledgeChunksUseCase,
    private readonly config: ConfigService,
  ) {
    this.TOOLS_MAP = {
      search: async (query: string) =>
        this.searchUseCase
          .execute({ query })
          .then((chunks) => chunks.join('\n')),
    };
    this.BASE_DATA = {
      model: this.config.getOrThrow('MOONSHOT_KIMI_MODEL'),
      temperature: parseFloat(
        this.config.get('MOONSHOT_KIMI_TEMPERATURE', '0.5'),
      ),
      stream: true,
      n: parseInt(this.config.get('MOONSHOT_KIMI_N', '1')),
      tools: this.TOOLS,
      tool_choice: this.config.get('MOONSHOT_KIMI_TOOL_CHOICE', 'auto'),
    };
  }

  async *chatStream(messages: Message[]): AsyncGenerator<string> {
    yield* this.runStreamingChatGenerator(
      // ✅ Use yield* instead of return
      messages.map((message) => ({
        role: message.role as 'user' | 'assistant',
        content: message.content,
      })),
    );
  }

  private parseSSELine(line) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') return null;
      try {
        return JSON.parse(data);
      } catch (e) {
        console.error('Failed to parse SSE data:', data, e);
        return null;
      }
    }
    return null;
  }

  private async processToolCalls(toolCalls, messages) {
    for (const toolCall of toolCalls) {
      if (toolCall.function?.name && this.TOOLS_MAP[toolCall.function.name]) {
        try {
          const args = JSON.parse(toolCall.function.arguments);
          const toolResult = await this.TOOLS_MAP[toolCall.function.name](args);

          messages.push({
            role: 'assistant',
            content: null,
            tool_calls: [
              {
                id: toolCall.id,
                type: toolCall.type,
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                },
              },
            ],
          });

          messages.push({
            role: 'tool',
            tool_call_id: toolCall.id,
            name: toolCall.function.name,
            content: JSON.stringify(toolResult),
          });
        } catch (error) {
          console.error('Tool execution error:', error);
        }
      }
    }

    // Continue the conversation with tool results
    return this.runStreamingChatGenerator(messages);
  }

  private async *runStreamingChatGenerator(messages: KimiMessage[]) {
    const response = await axios.post(
      this.config.getOrThrow('MOONSHOT_API_URL'),
      { ...this.BASE_DATA, messages },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.getOrThrow('MOONSHOT_API_KEY')}`,
        },
        responseType: 'stream',
      },
    );

    if (response.status !== 200) {
      console.log(response);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let buffer = '';
    let toolCalls = [];

    const stream = response.data;

    const reader = stream[Symbol.asyncIterator]
      ? stream[Symbol.asyncIterator]()
      : undefined;

    if (!reader) throw new Error('Stream does not support async iteration');

    try {
      for await (const chunk of reader) {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const parsed = this.parseSSELine(line.trim());
          if (!parsed) continue;

          // Handle tool_calls
          if (parsed.choices?.[0]?.delta?.tool_calls) {
            for (const toolCallDelta of parsed.choices[0].delta.tool_calls) {
              if (toolCallDelta.index !== undefined) {
                if (!toolCalls[toolCallDelta.index]) {
                  toolCalls[toolCallDelta.index] = {
                    id: toolCallDelta.id || '',
                    type: toolCallDelta.type || 'function',
                    function: { name: '', arguments: '' },
                  };
                }
                if (toolCallDelta.function?.name) {
                  toolCalls[toolCallDelta.index].function.name =
                    toolCallDelta.function.name;
                }
                if (toolCallDelta.function?.arguments) {
                  toolCalls[toolCallDelta.index].function.arguments +=
                    toolCallDelta.function.arguments;
                }
              }
            }
          }

          // Yield content chunks
          if (
            parsed.choices?.[0]?.delta?.content &&
            parsed.choices[0].finish_reason !== 'tool_calls'
          ) {
            yield parsed.choices[0].delta.content;
          }

          // Handle finish reasons
          if (parsed.choices?.[0]?.finish_reason) {
            if (parsed.choices[0].finish_reason === 'tool_calls') {
              response.data.destroy();
              // ✅ Use yield* to delegate to the new generator
              yield* await this.processToolCalls(toolCalls, messages);
              return; // End this generator after tool call processing
            } else if (parsed.choices[0].finish_reason === 'stop') {
              response.data.destroy();
              return;
            }
          }
        }
      }
    } catch (err) {
      throw err;
    } finally {
      stream.destroy();
    }
  }
}
