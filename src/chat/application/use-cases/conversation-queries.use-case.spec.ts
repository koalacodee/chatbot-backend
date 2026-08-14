import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Guest } from 'src/guest/domain/entities/guest.entity';
import {
  FakeConversationRepository,
  FakeMessageRepository,
  FakeRetrievedChunkRepository,
} from '../../__fixtures__/fake-chat-repositories';
import { Conversation } from '../../domain/entities/conversation.entity';
import { Message } from '../../domain/entities/message.entity';
import { GetAllConversationsUseCase } from './get-all-conversations.use-case';
import { GetConversationUseCase } from './get-conversation.use-case';
import { SaveMessagesUseCase } from './save-messages.use-case';

const GUEST_ID = '018f4a1e-1c7a-7000-8000-000000000201';
const OTHER_GUEST_ID = '018f4a1e-1c7a-7000-8000-000000000202';
const CONVERSATION_ID = '018f4a1e-1c7a-7000-8000-000000000203';

const buildGuest = (id = GUEST_ID) =>
  Guest.create({ id, name: 'Dana', email: `dana-${id}@example.com` });

describe('GetConversationUseCase', () => {
  let conversations: FakeConversationRepository;
  let useCase: GetConversationUseCase;

  beforeEach(() => {
    conversations = new FakeConversationRepository();
    useCase = new GetConversationUseCase(conversations);
  });

  const seed = (guest?: Guest) => {
    const conversation = Conversation.create({
      guest,
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
    });
    conversations.seed(conversation);
    return conversation;
  };

  it('rejects an unknown conversation', async () => {
    await expect(
      useCase.execute({ id: CONVERSATION_ID, guestId: GUEST_ID }),
    ).rejects.toThrow(NotFoundException);
  });

  it('returns the serialised conversation to its owner', async () => {
    const conversation = seed(buildGuest());

    const result = await useCase.execute({
      id: conversation.id.value,
      guestId: GUEST_ID,
    });

    expect(result).toMatchObject({
      id: conversation.id.value,
      guestId: GUEST_ID,
    });
  });

  it('refuses a guest who does not own the conversation', async () => {
    const conversation = seed(buildGuest());

    await expect(
      useCase.execute({ id: conversation.id.value, guestId: OTHER_GUEST_ID }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('refuses when no guest id is supplied at all', async () => {
    const conversation = seed(buildGuest());

    await expect(
      useCase.execute({ id: conversation.id.value }),
    ).rejects.toThrow(ForbiddenException);
  });

  /**
   * The ownership check reads `conversation.guest.id.value` unguarded. Conversations
   * created by ChatUseCase have no guest — only an anonymousId — so fetching one by id
   * fails with a TypeError rather than a 403. Pinned as a known gap: the guest-less chat
   * path and this endpoint are incompatible.
   */
  it('throws a TypeError, not a 403, for a guest-less conversation', async () => {
    const conversation = seed(undefined);

    await expect(
      useCase.execute({ id: conversation.id.value, guestId: GUEST_ID }),
    ).rejects.toThrow(TypeError);
  });
});

describe('GetAllConversationsUseCase', () => {
  let conversations: FakeConversationRepository;
  let useCase: GetAllConversationsUseCase;

  beforeEach(() => {
    conversations = new FakeConversationRepository();
    useCase = new GetAllConversationsUseCase(conversations);
  });

  it('returns only the given guest’s conversations, serialised', async () => {
    conversations.seed(
      Conversation.create({ guest: buildGuest() }),
      Conversation.create({ guest: buildGuest(OTHER_GUEST_ID) }),
    );

    const result = await useCase.execute({ guestId: GUEST_ID });

    expect(result).toHaveLength(1);
    expect(result[0].guestId).toBe(GUEST_ID);
  });

  it('returns an empty list when the guest has none', async () => {
    await expect(useCase.execute({ guestId: GUEST_ID })).resolves.toEqual([]);
  });

  it('includes nested messages in each serialised conversation', async () => {
    const conversation = Conversation.create({ guest: buildGuest() });
    conversation.addMessage(Message.create({ role: 'user', content: 'hi' }));
    conversations.seed(conversation);

    const [first] = await useCase.execute({ guestId: GUEST_ID });

    expect(first.messages).toHaveLength(1);
    expect(first.messages[0]).toMatchObject({ role: 'user', content: 'hi' });
  });

  /**
   * With no guestId the repository returns every conversation that has a guest — so this
   * is an unscoped read. It only stays private because the controller always supplies the
   * caller's id.
   */
  it('returns every guest-owned conversation when no guest id is given', async () => {
    conversations.seed(
      Conversation.create({ guest: buildGuest() }),
      Conversation.create({ guest: buildGuest(OTHER_GUEST_ID) }),
    );

    await expect(useCase.execute({})).resolves.toHaveLength(2);
  });
});

describe('SaveMessagesUseCase', () => {
  let messages: FakeMessageRepository;
  let chunks: FakeRetrievedChunkRepository;
  let useCase: SaveMessagesUseCase;

  beforeEach(() => {
    messages = new FakeMessageRepository();
    chunks = new FakeRetrievedChunkRepository();
    useCase = new SaveMessagesUseCase(messages, chunks);
  });

  it('saves the question and the answer', async () => {
    await useCase.execute('why?', 'because', CONVERSATION_ID, []);

    expect(messages.saved.map((m) => [m.role, m.content])).toEqual([
      ['USER', 'why?'],
      ['ASSISTANT', 'because'],
    ]);
  });

  /**
   * Both messages are written concurrently, so their order in the thread relies entirely
   * on the answer being stamped two seconds later than the question — not on insertion
   * order.
   */
  it('stamps the answer after the question so ordering survives', async () => {
    await useCase.execute('why?', 'because', CONVERSATION_ID, []);

    const [question, answer] = messages.saved;
    expect(answer.createdAt.getTime() - question.createdAt.getTime()).toBe(2000);
  });

  it('links both messages to the conversation', async () => {
    await useCase.execute('why?', 'because', CONVERSATION_ID, []);

    for (const message of messages.saved) {
      expect(message.conversationId?.value).toBe(CONVERSATION_ID);
    }
  });

  it('writes no retrieved chunks when none were used', async () => {
    await useCase.execute('why?', 'because', CONVERSATION_ID, []);

    expect(chunks.saved).toEqual([]);
  });
});
