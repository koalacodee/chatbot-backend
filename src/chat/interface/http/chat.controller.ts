import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AskUseCase } from 'src/chat/application/use-cases/ask.use-case';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { GuestInterceptor } from 'src/chat/infrastructure/interceptors/guest.interceptor';
import { GetAllConversationsUseCase } from 'src/chat/application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from 'src/chat/application/use-cases/get-conversation.use-case';

@Controller('chat')
export class AskController {
  constructor(
    private readonly askUseCase: AskUseCase,
    private readonly getAllConversationsUseCase: GetAllConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('ask')
  async ask(@Body() dto: AskDto, @Req() req: any) {
    // req.user.id is assumed to be set by JwtAuthGuard
    const answer = await this.askUseCase.execute({
      question: dto.question,
      conversationId: dto.conversationId,
      userId: req.user.id,
      faqId: dto.faqId,
    });
    return answer;
  }

  @Post('ask/guest')
  @UseInterceptors(GuestInterceptor)
  async askGuest(@Body() dto: AskDto, @Req() req: any) {
    const answer = await this.askUseCase.execute({
      question: dto.question,
      conversationId: dto.conversationId,
      guestId: req.guest.id,
      faqId: dto.faqId,
    });

    return answer;
  }

  @Get('conversations')
  @UseGuards(JwtAuthGuard)
  async getConversations(@Req() req: any) {
    const conversation = await this.getAllConversationsUseCase.execute({
      userId: req.user.id,
    });
    return conversation;
  }

  @Get('conversations/guest')
  @UseInterceptors(GuestInterceptor)
  async getConversationsGuest(@Req() req: any) {
    const conversation = await this.getAllConversationsUseCase.execute({
      guestId: req.guest.id,
    });
    return conversation;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getConversation(@Param('id') id: string, @Req() req) {
    return this.getConversationUseCase.execute({ id, userId: req.user.id });
  }

  @Get(':id/guest')
  @UseInterceptors(GuestInterceptor)
  async getConversationGuest(@Param('id') id: string, @Req() req) {
    return this.getConversationUseCase.execute({ id, guestId: req.guest.id });
  }
}
