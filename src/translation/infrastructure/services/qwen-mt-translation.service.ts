import { ConfigService } from '@nestjs/config';
import {
  SupportedLanguage,
  TranslationService,
} from 'src/translation/domain/services/translation.service';
import axios from 'axios';
import { Injectable } from '@nestjs/common';

@Injectable()
export class QwenMtTranslationService extends TranslationService {
  constructor(private readonly config: ConfigService) {
    super();
  }

  translate(
    text: string,
    targetLanguage: SupportedLanguage,
  ): Promise<string> | string {
    return this.translateText(text, targetLanguage);
  }

  private async translateText(
    text: string,
    targetLang: string,
  ): Promise<string> {
    try {
      const response = await axios.post(
        'https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions',
        {
          model: `qwen-mt-${this.config.getOrThrow('QWEN_MT_TYPE')}`,
          messages: [
            {
              role: 'user',
              content: text,
            },
          ],
          translation_options: {
            source_lang: 'auto',
            target_lang: targetLang,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${this.config.getOrThrow('DASHSCOPE_API_KEY')}`,
            'Content-Type': 'application/json',
          },
        },
      );

      // ممكن يكون الرد في شكل choices زى OpenAI API
      const translated =
        response.data?.choices?.[0]?.message?.content ||
        response.data?.output?.text ||
        'Translation not found.';

      return translated;
    } catch (error: any) {
      console.error(
        'Translation failed:',
        error.response?.data || error.message,
      );
      throw new Error('Translation request failed.');
    }
  }
}
