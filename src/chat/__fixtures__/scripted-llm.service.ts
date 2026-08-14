import { Message } from '../domain/entities/message.entity';
import { LLMService } from '../domain/services/llm.service';

/**
 * Yields a fixed script of chunks so the streaming contract can be exercised without a
 * model. It also captures the prompt it was handed, which is the only way to assert that
 * ChatUseCase sends prior history plus the new message, in order.
 */
export class ScriptedLLMService extends LLMService {
  /** The message list passed to each `chatStream` call. */
  readonly prompts: Message[][] = [];

  private chunks: string[] = [];
  private failure: Error | null = null;

  script(...chunks: string[]): this {
    this.chunks = chunks;
    return this;
  }

  /** Throws partway through the stream, after emitting `chunks` first. */
  failAfterScript(error: Error): this {
    this.failure = error;
    return this;
  }

  async *chatStream(messages: Message[]): AsyncGenerator<string> {
    // Snapshot: the caller builds this array inline and could mutate it afterwards.
    this.prompts.push([...messages]);

    for (const chunk of this.chunks) {
      yield chunk;
    }

    if (this.failure) throw this.failure;
  }
}
