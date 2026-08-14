import { NotFoundException } from '@nestjs/common';
import {
  FakeConversationRepository,
  FakeMessageRepository,
} from '../../__fixtures__/fake-chat-repositories';
import { ScriptedLLMService } from '../../__fixtures__/scripted-llm.service';
import { Conversation } from '../../domain/entities/conversation.entity';
import { Message } from '../../domain/entities/message.entity';
import { ChatUseCase } from './chat.use-case';

const GUEST_ID = '018f4a1e-1c7a-7000-8000-000000000201';

/** Drains the generator, returning both the streamed chunks and its return value. */
async function drain(
  generator: AsyncGenerator<string, string>,
): Promise<{ chunks: string[]; conversationId: string }> {
  const chunks: string[] = [];
  let result = await generator.next();

  while (!result.done) {
    chunks.push(result.value);
    result = await generator.next();
  }

  return { chunks, conversationId: result.value };
}

describe('ChatUseCase', () => {
  let conversations: FakeConversationRepository;
  let messages: FakeMessageRepository;
  let llm: ScriptedLLMService;
  let useCase: ChatUseCase;

  beforeEach(() => {
    conversations = new FakeConversationRepository();
    messages = new FakeMessageRepository();
    llm = new ScriptedLLMService().script('Hel', 'lo', '!');
    useCase = new ChatUseCase(llm, messages, conversations);
  });

  describe('conversation resolution', () => {
    it('rejects a conversationId that does not exist', async () => {
      await expect(
        drain(useCase.execute({ content: 'hi', conversationId: 'missing' })),
      ).rejects.toThrow(NotFoundException);
    });

    it('starts a new conversation when none is given', async () => {
      const { conversationId } = await drain(
        useCase.execute({ content: 'hi', guestId: GUEST_ID }),
      );

      expect(conversationId).toBeDefined();
      await expect(conversations.exists(conversationId)).resolves.toBe(true);
    });

    it('returns the id of the conversation it used', async () => {
      const existing = Conversation.create({});
      conversations.seed(existing);

      const { conversationId } = await drain(
        useCase.execute({ content: 'hi', conversationId: existing.id.value }),
      );

      expect(conversationId).toBe(existing.id.value);
      expect(conversations.conversations.size).toBe(1);
    });

    /**
     * The new conversation is created with `anonymousId: guestId` — it is never linked to
     * a Guest entity, so a conversation started through this path has no `guest` and
     * cannot be serialised by `Conversation.toJSON()`.
     */
    it('records the guest as an anonymousId rather than a guest link', async () => {
      const { conversationId } = await drain(
        useCase.execute({ content: 'hi', guestId: GUEST_ID }),
      );

      const created = await conversations.findById(conversationId);
      expect(created?.anonymousId.value).toBe(GUEST_ID);
      expect(created?.guest).toBeUndefined();
    });
  });

  describe('streaming', () => {
    it('yields every chunk the model produces, in order', async () => {
      const { chunks } = await drain(useCase.execute({ content: 'hi' }));

      expect(chunks).toEqual(['Hel', 'lo', '!']);
    });

    it('handles an empty stream', async () => {
      llm.script();

      const { chunks } = await drain(useCase.execute({ content: 'hi' }));

      expect(chunks).toEqual([]);
    });
  });

  describe('what the model is asked', () => {
    it('sends prior history followed by the new message', async () => {
      const existing = Conversation.create({});
      conversations.seed(existing);
      messages.seed(
        Message.create({
          role: 'user',
          content: 'earlier',
          conversationId: existing.id.value,
          createdAt: new Date('2025-01-01T00:00:00.000Z'),
        }),
      );

      await drain(
        useCase.execute({ content: 'now', conversationId: existing.id.value }),
      );

      expect(llm.prompts).toHaveLength(1);
      expect(llm.prompts[0].map((m) => m.content)).toEqual(['earlier', 'now']);
    });

    it('sends only the new message for a fresh conversation', async () => {
      await drain(useCase.execute({ content: 'first ever' }));

      expect(llm.prompts[0].map((m) => m.content)).toEqual(['first ever']);
    });
  });

  describe('persistence', () => {
    it('saves the user message before streaming and the assistant message after', async () => {
      await drain(useCase.execute({ content: 'hi' }));

      expect(messages.saved.map((m) => m.role)).toEqual(['user', 'assistant']);
    });

    it('stores the assembled response as the assistant message', async () => {
      await drain(useCase.execute({ content: 'hi' }));

      const assistant = messages.saved[1];
      expect(assistant.content).toBe('Hello!');
    });

    it('links both messages to the same conversation', async () => {
      const { conversationId } = await drain(useCase.execute({ content: 'hi' }));

      for (const message of messages.saved) {
        expect(message.conversationId?.value).toBe(conversationId);
      }
    });

    it('stores an empty assistant message when the model yields nothing', async () => {
      llm.script();

      await drain(useCase.execute({ content: 'hi' }));

      expect(messages.saved[1].content).toBe('');
    });

    /**
     * There is no try/catch around the stream, so a mid-stream model failure propagates
     * and the assistant message is never written — the user's message is already
     * persisted, leaving the thread with a question and no answer.
     */
    it('loses the assistant message if the model fails mid-stream', async () => {
      llm.script('partial').failAfterScript(new Error('model exploded'));

      await expect(drain(useCase.execute({ content: 'hi' }))).rejects.toThrow(
        'model exploded',
      );

      expect(messages.saved.map((m) => m.role)).toEqual(['user']);
    });
  });
});
