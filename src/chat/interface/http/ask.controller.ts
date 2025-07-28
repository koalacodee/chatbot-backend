import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AskUseCase } from 'src/chat/application/use-cases/ask.use-case';
import { AskDto } from './dto/ask.dto';
import { JwtAuthGuard } from 'src/auth/infrastructure/guards/jwt-auth.guard';
import { GuestInterceptor } from 'src/chat/infrastructure/interceptors/guest.interceptor';

@Controller('chat')
export class AskController {
  constructor(private readonly askUseCase: AskUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Post('ask')
  async ask(@Body() dto: AskDto, @Req() req: any) {
    // req.user.id is assumed to be set by JwtAuthGuard
    const answer = await this.askUseCase.execute({
      question: dto.question,
      conversationId: dto.conversationId,
      userId: req.user.id,
    });
    return { answer };
  }

  @Post('ask/guest')
  @UseInterceptors(GuestInterceptor)
  async askGuest(@Body() dto: AskDto, @Req() req: any) {
    const answer = await this.askUseCase.execute({
      question: dto.question,
      conversationId: dto.conversationId,
      guestId: req.guest.id,
    });

    return { answer };
  }
}
