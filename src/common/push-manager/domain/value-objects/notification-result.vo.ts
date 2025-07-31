interface NotificationResultOptions {
  recipientId: string;
  recipientType: 'user' | 'guest';
  success: boolean;
  error?: string;
  subscriptionResults?: Array<{
    subscriptionId: string;
    success: boolean;
    error?: string;
  }>;
}

export class NotificationResult {
  private readonly _recipientId: string;
  private readonly _recipientType: 'user' | 'guest';
  private readonly _success: boolean;
  private readonly _error?: string;
  private readonly _subscriptionResults?: Array<{
    subscriptionId: string;
    success: boolean;
    error?: string;
  }>;

  private constructor(options: NotificationResultOptions) {
    this._recipientId = options.recipientId;
    this._recipientType = options.recipientType;
    this._success = options.success;
    this._error = options.error;
    this._subscriptionResults = options.subscriptionResults;
  }

  // Getters
  get recipientId(): string {
    return this._recipientId;
  }

  get recipientType(): 'user' | 'guest' {
    return this._recipientType;
  }

  get success(): boolean {
    return this._success;
  }

  get error(): string | undefined {
    return this._error;
  }

  get subscriptionResults():
    | Array<{
        subscriptionId: string;
        success: boolean;
        error?: string;
      }>
    | undefined {
    return this._subscriptionResults;
  }

  static create(options: NotificationResultOptions): NotificationResult {
    return new NotificationResult(options);
  }

  toJSON() {
    return {
      recipientId: this._recipientId,
      recipientType: this._recipientType,
      success: this._success,
      error: this._error,
      subscriptionResults: this._subscriptionResults,
    };
  }
}
