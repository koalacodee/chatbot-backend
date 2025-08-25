import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AskUseCase } from 'src/chat/application/use-cases/ask.use-case';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { GetAllConversationsUseCase } from 'src/chat/application/use-cases/get-all-conversations.use-case';
import { GetConversationUseCase } from 'src/chat/application/use-cases/get-conversation.use-case';
import { UseRoles } from 'src/rbac';
import { Roles } from 'src/shared/value-objects/role.vo';

@Controller('chat')
export class AskController {
  constructor(
    private readonly askUseCase: AskUseCase,
    private readonly getAllConversationsUseCase: GetAllConversationsUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @UseRoles(Roles.GUEST)
  @Post('ask')
  async ask(@Body() dto: AskDto, @Req() req: any) {
    // req.user.id is assumed to be set by JwtAuthGuard
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
  @UseRoles(Roles.GUEST)
  async getConversations(@Req() req: any) {
    const conversation = await this.getAllConversationsUseCase.execute({
      guestId: req.guest.id,
    });
    return conversation;
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @UseRoles(Roles.GUEST)
  async getConversation(@Param('id') id: string, @Req() req) {
    return this.getConversationUseCase.execute({ id, guestId: req.guest.id });
  }
}
