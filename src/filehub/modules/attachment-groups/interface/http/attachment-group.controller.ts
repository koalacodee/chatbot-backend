import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Req,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Res,
  UseGuards,
} from '@nestjs/common';
import { CreateAttachmentGroupUseCase } from '../../application/use-cases/create-attachment-group.use-case';
import { GetAttachmentGroupByKeyUseCase } from '../../application/use-cases/get-attachment-group-by-key.use-case';
import { GetAttachmentGroupDetailsUseCase } from '../../application/use-cases/get-attachment-group-details.use-case';
import { GetMyAttachmentGroupsUseCase } from '../../application/use-cases/get-my-attachment-groups.use-case';
import { UpdateAttachmentGroupUseCase } from '../../application/use-cases/update-attachment-group.use-case';
import { DeleteAttachmentGroupUseCase } from '../../application/use-cases/delete-attachment-group.use-case';
import { CloseAttachmentGroupUseCase } from '../../application/use-cases/close-attachment-group.use-case';
import { RequestMembershipUseCase } from '../../application/use-cases/request-membership.use-case';
import { VerifyMemberOtpUseCase } from '../../application/use-cases/verify-member-otp.use-case';
import { GetAttachmentGroupByMemberIdUseCase } from '../../application/use-cases/get-attachment-group-by-member-id.use-case';
import { GetAllMembersWithGroupsUseCase } from '../../application/use-cases/get-all-members-with-groups.use-case';
import { UpdateMemberUseCase } from '../../application/use-cases/update-member.use-case';
import { DeleteMemberUseCase } from '../../application/use-cases/delete-member.use-case';
import { AddMemberUseCase } from '../../application/use-cases/add-member.use-case';
import { CreateAttachmentGroupDto } from './dto/create-attachment-group.dto';
import { UpdateAttachmentGroupDto } from './dto/update-attachment-group.dto';
import { VerifyMemberOtpDto } from './dto/verify-member-otp.dto';
import { GetAllMembersDto } from './dto/get-all-members.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { FastifyReply, FastifyRequest } from 'fastify';
import { SupervisorOrEmployeePermissions } from 'src/rbac/decorators';
import { EmployeePermissionsEnum } from 'src/employee/domain/entities/employee.entity';
import { SupervisorPermissionsEnum } from 'src/supervisor/domain/entities/supervisor.entity';
import { randomBytes } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { MemberJwtGuard } from './guards/member.guard';

@Controller('filehub/attachment-groups')
export class AttachmentGroupController {
  constructor(
    private readonly createAttachmentGroupUseCase: CreateAttachmentGroupUseCase,
    private readonly getAttachmentGroupByKeyUseCase: GetAttachmentGroupByKeyUseCase,
    private readonly getAttachmentGroupDetailsUseCase: GetAttachmentGroupDetailsUseCase,
    private readonly getMyAttachmentGroupsUseCase: GetMyAttachmentGroupsUseCase,
    private readonly updateAttachmentGroupUseCase: UpdateAttachmentGroupUseCase,
    private readonly deleteAttachmentGroupUseCase: DeleteAttachmentGroupUseCase,
    private readonly closeAttachmentGroupUseCase: CloseAttachmentGroupUseCase,
    private readonly requestMembershipUseCase: RequestMembershipUseCase,
    private readonly verifyMemberOtpUseCase: VerifyMemberOtpUseCase,
    private readonly getAttachmentGroupByMemberIdUseCase: GetAttachmentGroupByMemberIdUseCase,
    private readonly getAllMembersWithGroupsUseCase: GetAllMembersWithGroupsUseCase,
    private readonly updateMemberUseCase: UpdateMemberUseCase,
    private readonly deleteMemberUseCase: DeleteMemberUseCase,
    private readonly addMemberUseCase: AddMemberUseCase,
    private readonly configService: ConfigService,
  ) {}

  // Create a new attachment group
  @Post()
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async createAttachmentGroup(
    @Req() req: any,
    @Body() createDto: CreateAttachmentGroupDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.createAttachmentGroupUseCase.execute({
      userId,
      name: createDto.name,
      attachmentIds: createDto.attachmentIds,
      expiresAt: createDto.expiresAt,
    });

    return {
      key: result.key,
    };
  }

  // Get attachment group by key (for clients)
  @Get('shared/:key')
  async getAttachmentGroupByKey(
    @Param('key') key: string,
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    // const ip = req.ip || '0.0.0.0';

    let clientId = req.cookies['clientId'];

    if (!clientId) {
      clientId = randomBytes(16).toString('hex');
      res.cookie('clientId', clientId, {
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 365, // 1 year
        path: '/',
      });
    }

    const result = await this.getAttachmentGroupByKeyUseCase.execute({
      key,
      clientId,
    });

    return {
      attachments: result.attachments,
    };
  }

  // Get attachment group details (for creators)
  @Get(':id')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async getAttachmentGroupDetails(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.getAttachmentGroupDetailsUseCase.execute({
      groupId: id,
      userId,
    });

    // Add file type and content type to each attachment
    const attachmentsWithMetadata = result.attachments.map((attachment) => {
      return {
        ...attachment.toJSON(),
        fileType: this.getFileType(attachment.originalName),
        contentType: this.getContentType(attachment.originalName),
      };
    });

    return {
      id: result.id,
      name: result.name,
      key: result.key,
      ips: result.ips,
      attachments: attachmentsWithMetadata,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
      expiresAt: result.expiresAt,
    };
  }

  // Get all attachment groups for a user
  @Get()
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async getMyAttachmentGroups(
    @Req() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;

    const result = await this.getMyAttachmentGroupsUseCase.execute({
      userId,
      limit: limitNum,
      offset: offsetNum,
    });

    // Add file type and content type to each attachment in each group
    const groupsWithMetadata = result.attachmentGroups.map((group) => {
      const attachmentsWithMetadata = group.attachments.map((attachment) => {
        return {
          ...attachment.toJSON(),
          fileType: this.getFileType(attachment.originalName),
          contentType: this.getContentType(attachment.originalName),
        };
      });

      return {
        ...group,
        name: group.name,
        attachments: attachmentsWithMetadata,
        expiresAt: group.expiresAt,
      };
    });

    return {
      attachmentGroups: groupsWithMetadata,
      totalCount: result.totalCount,
      hasMore: result.hasMore,
    };
  }

  // Update an attachment group
  @Put(':id')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async updateAttachmentGroup(
    @Param('id') id: string,
    @Req() req: any,
    @Body() updateDto: UpdateAttachmentGroupDto,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.updateAttachmentGroupUseCase.execute({
      groupId: id,
      userId,
      name: updateDto.name,
      attachmentIds: updateDto.attachmentIds,
      expiresAt: updateDto.expiresAt,
    });

    return {
      success: result.success,
    };
  }

  // Delete an attachment group
  @Delete(':id')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async deleteAttachmentGroup(@Param('id') id: string, @Req() req: any) {
    const userId = req.user?.id;
    if (!userId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const result = await this.deleteAttachmentGroupUseCase.execute({
      groupId: id,
      userId,
    });

    return {
      success: result.success,
    };
  }

  // Close an attachment group (remove IP from watchers)
  @Post('close/:key')
  async closeAttachmentGroup(
    @Param('key') key: string,
    @Req() req: FastifyRequest,
  ) {
    const clientId = req.cookies['clientId'];

    if (!clientId) {
      return { success: false };
    }

    const result = await this.closeAttachmentGroupUseCase.execute({
      key,
      clientId,
    });

    return {
      success: result.success,
    };
  }

  // Request membership OTP
  @Post('membership/request')
  async requestMembership() {
    const otp = await this.requestMembershipUseCase.execute();

    return {
      otp,
    };
  }

  // Verify member OTP and set access token cookie
  @Post('membership/verify')
  async verifyMemberOtp(
    @Body() dto: VerifyMemberOtpDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ) {
    const result = await this.verifyMemberOtpUseCase.execute({
      authorizeOtp: dto.authorizeOtp,
    });

    // Set the access token as a cookie
    this.setMemberAccessTokenCookie(res, result.accessToken);

    return {
      success: true,
    };
  }

  // Get attachment group by member ID
  @Get('membership')
  @UseGuards(MemberJwtGuard)
  async getAttachmentGroupByMemberId(@Req() req: any) {
    const memberId = req.user?.id;
    if (!memberId) {
      throw new HttpException(
        'User not authenticated',
        HttpStatus.UNAUTHORIZED,
      );
    }
    const result = await this.getAttachmentGroupByMemberIdUseCase.execute({
      memberId,
    });

    // Add file type and content type to each attachment
    const attachmentsWithMetadata = result.fileHubAttachments.map(
      (attachment) => {
        return {
          ...attachment,
          fileType: this.getFileType(attachment.originalName),
          contentType: this.getContentType(attachment.originalName),
        };
      },
    );

    return {
      attachmentGroup: result.attachmentGroup.toJSON(),
      attachments: attachmentsWithMetadata,
      memberId,
    };
  }

  // Add a new member to an attachment group
  @Post('members')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async addMember(@Body() addMemberDto: AddMemberDto) {
    const member = await this.addMemberUseCase.execute({
      otp: addMemberDto.otp,
      name: addMemberDto.name,
      attachmentGroupId: addMemberDto.attachmentGroupId,
    });

    return {
      success: true,
      member: {
        id: member.id.value,
        name: member.name,
        memberId: member.memberId.value,
        attachmentGroupId: member.attachmentGroupId.value,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt,
      },
    };
  }

  // Get all members with their attachment group details
  @Get('members/all')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async getAllMembersWithGroups(@Query() query: GetAllMembersDto) {
    const result = await this.getAllMembersWithGroupsUseCase.execute({
      limit: query.limit,
      offset: query.offset,
    });

    return {
      members: result.members,
      pagination: result.pagination,
    };
  }

  // Update a member's details
  @Put('members/:memberId')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async updateMember(
    @Param('memberId') memberId: string,
    @Body() updateDto: UpdateMemberDto,
  ) {
    const result = await this.updateMemberUseCase.execute({
      memberId,
      name: updateDto.name,
      attachmentGroupId: updateDto.attachmentGroupId,
    });

    return {
      member: result,
    };
  }

  // Delete a member
  @Delete('members/:memberId')
  @SupervisorOrEmployeePermissions({
    employeePermissions: [EmployeePermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
    supervisorPermissions: [SupervisorPermissionsEnum.MANAGE_ATTACHMENT_GROUPS],
  })
  async deleteMember(@Param('memberId') memberId: string) {
    try {
      const result = await this.deleteMemberUseCase.execute({
        memberId,
      });

      return {
        success: result.success,
        deletedMember: result.deletedMember,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to delete member',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Helper methods for file type and content type
  private getFileType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const fileTypes: { [key: string]: string } = {
      // Images
      jpg: 'image',
      jpeg: 'image',
      png: 'image',
      gif: 'image',
      webp: 'image',
      svg: 'image',
      bmp: 'image',
      ico: 'image',

      // Documents
      pdf: 'document',
      doc: 'document',
      docx: 'document',
      xls: 'document',
      xlsx: 'document',
      ppt: 'document',
      pptx: 'document',
      txt: 'document',
      rtf: 'document',

      // Audio
      mp3: 'audio',
      wav: 'audio',
      ogg: 'audio',
      m4a: 'audio',
      aac: 'audio',

      // Video
      mp4: 'video',
      avi: 'video',
      mov: 'video',
      wmv: 'video',
      flv: 'video',
      webm: 'video',

      // Archives
      zip: 'archive',
      rar: 'archive',
      '7z': 'archive',
      tar: 'archive',
      gz: 'archive',

      // Code
      js: 'code',
      ts: 'code',
      json: 'code',
      xml: 'code',
      html: 'code',
      css: 'code',

      // Default
      default: 'unknown',
    };

    return fileTypes[ext || ''] || fileTypes.default;
  }

  private getContentType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      // Images
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      webp: 'image/webp',
      svg: 'image/svg+xml',
      bmp: 'image/bmp',
      ico: 'image/x-icon',

      // Documents
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      ppt: 'application/vnd.ms-powerpoint',
      pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      txt: 'text/plain',
      rtf: 'application/rtf',

      // Audio
      mp3: 'audio/mpeg',
      wav: 'audio/wav',
      ogg: 'audio/ogg',
      m4a: 'audio/mp4',
      aac: 'audio/aac',

      // Video
      mp4: 'video/mp4',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      wmv: 'video/x-ms-wmv',
      flv: 'video/x-flv',
      webm: 'video/webm',

      // Archives
      zip: 'application/zip',
      rar: 'application/x-rar-compressed',
      '7z': 'application/x-7z-compressed',
      tar: 'application/x-tar',
      gz: 'application/gzip',

      // Code
      js: 'application/javascript',
      ts: 'application/typescript',
      json: 'application/json',
      xml: 'application/xml',
      html: 'text/html',
      css: 'text/css',

      // Default
      default: 'application/octet-stream',
    };

    return mimeTypes[ext || ''] || mimeTypes.default;
  }

  // Helper method to set member access token cookie
  private setMemberAccessTokenCookie(res: FastifyReply, token: string) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 15); // 15 days

    const COOKIE_SAMESITE = this.configService.get(
      'COOKIES_SAMESITE',
      'strict',
    );
    const COOKIE_SECURE = this.configService.get('COOKIES_SECURE', true);

    res.setCookie('attachment_group_member_token', token, {
      httpOnly: true,
      secure: COOKIE_SECURE,
      sameSite: COOKIE_SAMESITE,
      expires: expiryDate,
      path: '/',
    });
  }
}
