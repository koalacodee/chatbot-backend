import { SupportedLanguage } from '../services/translation.service';

export class TranslateEvent {
  constructor(
    public readonly content: string,
    public readonly targetId: string,
    public readonly targetLanguages: SupportedLanguage[],
  ) {}
}
