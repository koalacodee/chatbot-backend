import { KnowledgeChunk } from 'src/knowledge-chunks/domain/entities/knowledge-chunk.entity';

interface CreateRetrievedChunkOptions {
  id?: string;
  messageId: string;
  knowledgeChunk: KnowledgeChunk;
  score: number;
  retrievedAt?: Date;
}

export class RetrievedChunk {
  private readonly _id: string;
  private _messageId: string;
  private _knowledgeChunk: KnowledgeChunk;
  private _score: number;
  private _retrievedAt: Date;

  private constructor(options: {
    id: string;
    messageId: string;
    knowledgeChunk: KnowledgeChunk;
    score: number;
    retrievedAt: Date;
  }) {
    this._id = options.id;
    this._messageId = options.messageId;
    this._knowledgeChunk = options.knowledgeChunk;
    this._score = options.score;
    this._retrievedAt = options.retrievedAt;
  }

  static create(options: CreateRetrievedChunkOptions): RetrievedChunk {
    return new RetrievedChunk({
      id: options.id || crypto.randomUUID(),
      messageId: options.messageId,
      knowledgeChunk: options.knowledgeChunk,
      score: options.score,
      retrievedAt: options.retrievedAt || new Date(),
    });
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get messageId(): string {
    return this._messageId;
  }

  get knowledgeChunk(): KnowledgeChunk {
    return this._knowledgeChunk;
  }

  get score(): number {
    return this._score;
  }

  get retrievedAt(): Date {
    return this._retrievedAt;
  }

  // Setters
  set messageId(newMessageId: string) {
    this._messageId = newMessageId;
  }

  set score(newScore: number) {
    this._score = newScore;
  }

  // Utility methods
  toJSON() {
    return {
      id: this._id,
      messageId: this._messageId,
      knowledgeChunk: this._knowledgeChunk.toJSON(),
      score: this._score,
      retrievedAt: this._retrievedAt.toISOString(),
    };
  }

  equals(other: RetrievedChunk): boolean {
    return this._id === other._id;
  }

  clone(): RetrievedChunk {
    return new RetrievedChunk({
      id: this._id,
      messageId: this._messageId,
      knowledgeChunk: this._knowledgeChunk.clone(),
      score: this._score,
      retrievedAt: new Date(this._retrievedAt),
    });
  }
}
