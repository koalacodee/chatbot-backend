import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Sse,
  UseInterceptors,
} from '@nestjs/common';
import { AskDto } from './dto/ask.dto';
import { GetAllConversationsUseCase } from 'src/chat/application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from 'src/chat/application/use-cases/get-conversation.use-case';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';
import { ChatUseCase } from 'src/chat/application/use-cases/chat.use-case';
import { Observable } from 'rxjs';

@Controller('chat')
export class AskController {
  constructor(
    private readonly getAllConversationsUseCase: GetAllConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
    private readonly chatUseCase: ChatUseCase,
  ) {}

  @Get('conversations')
  @UseInterceptors(GuestIdInterceptor)
  async getConversations(@Req() req: any) {
    const conversation = await this.getAllConversationsUseCase.execute({
      guestId: req.guest.id,
    });
    return conversation;
  }

  @Get(':id')
  @UseInterceptors(GuestIdInterceptor)
  async getConversation(@Param('id') id: string, @Req() req: any) {
    return this.getConversationUseCase.execute({ id, guestId: req.guest.id });
  }

  @Post()
  @Sse() // ← registers SSE route: POST -> /chat
  @UseInterceptors(GuestIdInterceptor)
  chat(@Body() dto: AskDto, @Req() req: any): Observable<MessageEvent> {
    const generator = this.chatUseCase.execute({
      content: dto.question,
      conversationId: dto.conversationId,
      guestId: req.guest.id,
    });

    return new Observable<MessageEvent>((subscriber) => {
      (async () => {
        try {
          while (true) {
            const { done, value } = await generator.next();

            if (done) {
              subscriber.next({
                type: 'conversation_meta',
                data: { conversationId: value },
              } as MessageEvent);
              break;
            }

            // Construct a proper MessageEvent for SSE
            subscriber.next({
              type: 'message',
              data: value,
            } as MessageEvent);
          }
          subscriber.next({
            data: '[DONE]',
          } as MessageEvent);
          subscriber.complete();
        } catch (error) {
          subscriber.error('Something went wrong');
          console.error(error);
        }
      })();
    });
  }
}
