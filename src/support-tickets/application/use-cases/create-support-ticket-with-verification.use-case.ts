import { Injectable, NotFoundException } from '@nestjs/common';
import {
  SupportTicket,
  SupportTicketStatus,
} from '../../domain/entities/support-ticket.entity';
import { DepartmentRepository } from 'src/department/domain/repositories/department.repository';
import { FilesService } from 'src/files/domain/services/files.service';
import { RedisTicketStorageService } from '../../infrastructure/services/redis-ticket-storage.service';
import { ResendEmailService } from 'src/shared/infrastructure/email/resend-email.service';
import { SupportTicketVerificationEmail } from 'src/shared/infrastructure/email/templates/support-ticket-verification.template';
import { ConfigService } from '@nestjs/config';
import { randomInt, randomUUID } from 'crypto';

interface CreateSupportTicketWithVerificationInputDto {
  subject: string;
  description: string;
  departmentId: string;
  attach?: boolean;
  guestName?: string;
  guestPhone?: string;
  guestEmail?: string;
}

interface CreateSupportTicketWithVerificationOutput {
  message: string;
  ticketId: string;
  verificationEmailSent: boolean;
}

@Injectable()
export class CreateSupportTicketWithVerificationUseCase {
  constructor(
    private readonly departmentRepo: DepartmentRepository,
    private readonly fileService: FilesService,
    private readonly redisTicketStorage: RedisTicketStorageService,
    private readonly emailService: ResendEmailService,
    private readonly configService: ConfigService,
  ) {}

  async execute(
    dto: CreateSupportTicketWithVerificationInputDto,
  ): Promise<CreateSupportTicketWithVerificationOutput> {
    // Validate foreign keys
    const department = await this.departmentRepo.findById(dto.departmentId);
    if (!department) {
      throw new NotFoundException({ departmentId: 'department_not_found' });
    }

    // Validate email is provided for verification
    if (!dto.guestEmail) {
      throw new NotFoundException({
        guestEmail: 'email_required_for_verification',
      });
    }

    const now = new Date();
    const ticket = SupportTicket.create({
      subject: dto.subject,
      description: dto.description,
      departmentId: dto.departmentId,
      status: SupportTicketStatus.NEW,
      createdAt: now,
      updatedAt: now,
      guestName: dto.guestName,
      guestPhone: dto.guestPhone,
      guestEmail: dto.guestEmail,
    });

    // Generate verification token
    const verificationToken = randomInt(100000, 999999).toString();

    // Store ticket in Redis temporarily
    await this.redisTicketStorage.storeTemporaryTicket(
      ticket,
      verificationToken,
      dto.attach,
    );

    // Send verification email

    await this.emailService.sendReactEmail(
      dto.guestEmail,
      'Verify Your Support Ticket',
      SupportTicketVerificationEmail,
      {
        guestName: dto.guestName || 'Valued Customer',
        ticketSubject: dto.subject,
        ticketDescription: dto.description,
        departmentName: department.name,
        verificationCode: verificationToken,
        ticketId: ticket.id.toString(),
      },
    );

    return {
      message:
        'Support ticket created successfully. Please check your email to verify and submit the ticket.',
      ticketId: ticket.id.toString(),
      verificationEmailSent: true,
    };
  }
}
