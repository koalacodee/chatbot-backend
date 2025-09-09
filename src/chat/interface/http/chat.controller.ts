import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseInterceptors,
} from '@nestjs/common';
import { AskUseCase } from 'src/chat/application/use-cases/ask.use-case';
import { AskDto } from './dto/ask.dto';
import { GetAllConversationsUseCase } from 'src/chat/application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from 'src/chat/application/use-cases/get-conversation.use-case';
import { GuestIdInterceptor } from 'src/shared/interceptors/guest-id.interceptor';

@Controller('chat')
export class AskController {
  constructor(
    private readonly askUseCase: AskUseCase,
    private readonly getAllConversationsUseCase: GetAllConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
  ) {}

  @UseInterceptors(GuestIdInterceptor)
  @Post('ask')
  async ask(@Body() dto: AskDto, @Req() req: any) {
    // req.guest.id is assumed to be set by JwtAuthGuard
    const answer = await this.askUseCase.execute({
      question: dto.question,
      conversationId: dto.conversationId,
      guestId: req.guest.id,
      faqId: dto.faqId,
    });
    return answer;
  }

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
}
