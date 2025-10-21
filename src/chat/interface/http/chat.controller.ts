import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  Sse,
  UseInterceptors,
} from '@nestjs/common';
import { AskDto } from './dto/ask.dto';
import { GetAllConversationsUseCase } from 'src/chat/application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from 'src/chat/application/use-cases/get-conversation.use-case';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';
import { ChatUseCase } from 'src/chat/application/use-cases/chat.use-case';
import { Observable } from 'rxjs';
import { FastifyReply } from 'fastify';

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
  @UseInterceptors(GuestIdInterceptor)
  chat(@Body() dto: AskDto, @Res() res: FastifyReply, @Req() req: any) {
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    const generator = this.chatUseCase.execute({
      content: dto.question,
      conversationId: dto.conversationId,
      guestId: req.guest.id,
    });

    (async () => {
      try {
        while (true) {
          const { value, done } = await generator.next();
          if (done) {
            res.raw.write(
              `data: ${JSON.stringify({ type: 'conversation_meta', data: { conversationId: value } })}\n\n`,
            );
            break;
          }
          res.raw.write(
            `data: ${JSON.stringify({ type: 'message', data: value })}\n\n`,
          );
        }
        res.raw.write(`data: [DONE]\n\n`);
        res.raw.end();
      } catch (err) {
        res.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
        res.raw.end();
      }
    })();
    // (async () => {
    //   try {
    //     for await (const chunk of generator) {
    //       res.raw.write(`data: ${chunk}\n\n`);
    //     }
    //     res.raw.write(`data: [DONE]\n\n`);
    //     res.raw.end();
    //   } catch (err) {
    //     res.raw.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    //     res.raw.end();
    //   }
    // })()  }
  }
}
