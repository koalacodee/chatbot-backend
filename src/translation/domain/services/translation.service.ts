export type SupportedLanguage =
  | 'en' // English
  | 'es' // Spanish
  | 'fr' // French
  | 'de' // German
  | 'ar' // Arabic
  | 'pt' // Portuguese
  | 'ru' // Russian
  | 'zh' // Chinese (Simplified)
  | 'ja' // Japanese
  | 'tr'; // Turkish

export abstract class TranslationService {
  abstract translate(
    text: string,
    targetLanguage: SupportedLanguage,
  ): Promise<string> | string;
}
