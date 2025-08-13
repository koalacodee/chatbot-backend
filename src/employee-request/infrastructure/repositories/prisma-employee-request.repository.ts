import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/common/prisma/prisma.service';
import { EmployeeRequestRepository } from '../../domain/repositories/employee-request.repository';
import { EmployeeRequest } from '../../domain/entities/employee-request.entity';
import { Email } from 'src/shared/value-objects/email.vo';
import { User } from 'src/shared/entities/user.entity';
import { RequestStatus as PrismaRequestStatus } from '@prisma/client';

@Injectable()
export class PrismaEmployeeRequestRepository extends EmployeeRequestRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  private async toDomain(row: any): Promise<EmployeeRequest> {
    const requestedBySupervisor: User = await User.create(row.requestedBySupervisor, false);
    const resolvedByAdmin: User | undefined = row.resolvedByAdmin
      ? await User.create(row.resolvedByAdmin, false)
      : undefined;

    return EmployeeRequest.create({
      id: row.id,
      requestedBySupervisor,
      newEmployeeEmail: Email.create(row.newEmployeeEmail),
      newEmployeeFullName: row.newEmployeeFullName ?? undefined,
      newEmployeeDesignation: row.newEmployeeDesignation ?? undefined,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      resolvedAt: row.resolvedAt ?? undefined,
      resolvedByAdmin,
      rejectionReason: row.rejectionReason ?? undefined,
      acknowledgedBySupervisor: row.acknowledgedBySupervisor ?? false,
    });
  }

  async save(request: EmployeeRequest): Promise<EmployeeRequest> {
    const upserted = await this.prisma.employeeRequest.upsert({
      where: { id: request.id },
      update: {
        newEmployeeEmail: request.newEmployeeEmail.toString(),
        newEmployeeFullName: request.newEmployeeFullName ?? null,
        newEmployeeDesignation: request.newEmployeeDesignation ?? null,
        status: PrismaRequestStatus[request.status as keyof typeof PrismaRequestStatus] as any,
        resolvedAt: request.resolvedAt ?? null,
        rejectionReason: request.rejectionReason ?? null,
        acknowledgedBySupervisor: request.acknowledgedBySupervisor,
        updatedAt: new Date(),
        requestedBySupervisor: { connect: { id: request.requestedBySupervisor.id.toString() } },
        ...(request.resolvedByAdmin
          ? { resolvedByAdmin: { connect: { id: request.resolvedByAdmin.id.toString() } } }
          : { resolvedByAdmin: { disconnect: true } }),
      },
      create: {
        id: request.id,
        newEmployeeEmail: request.newEmployeeEmail.toString(),
        newEmployeeFullName: request.newEmployeeFullName ?? null,
        newEmployeeDesignation: request.newEmployeeDesignation ?? null,
        status: PrismaRequestStatus[request.status as keyof typeof PrismaRequestStatus] as any,
        createdAt: request.createdAt,
        updatedAt: new Date(),
        resolvedAt: request.resolvedAt ?? null,
        rejectionReason: request.rejectionReason ?? null,
        acknowledgedBySupervisor: request.acknowledgedBySupervisor,
        requestedBySupervisor: { connect: { id: request.requestedBySupervisor.id.toString() } },
        ...(request.resolvedByAdmin
          ? { resolvedByAdmin: { connect: { id: request.resolvedByAdmin.id.toString() } } }
          : {}),
      },
      include: {
        requestedBySupervisor: true,
        resolvedByAdmin: true,
      },
    });

    return this.toDomain(upserted);
  }

  async findById(id: string): Promise<EmployeeRequest | null> {
    const row = await this.prisma.employeeRequest.findUnique({
      where: { id },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAll(offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async removeById(id: string): Promise<EmployeeRequest | null> {
    const existing = await this.findById(id);
    if (!existing) return null;
    await this.prisma.employeeRequest.delete({ where: { id } });
    return existing;
  }

  async exists(id: string): Promise<boolean> {
    const count = await this.prisma.employeeRequest.count({ where: { id } });
    return count > 0;
  }

  async count(): Promise<number> {
    return this.prisma.employeeRequest.count();
  }

  async findBySupervisorId(supervisorId: string, offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      where: { requestedBySupervisorId: supervisorId },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findByStatus(status: string, offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      where: { status: status as any },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findPending(offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      where: { status: 'PENDING' as any },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }

  async findResolved(offset?: number, limit?: number): Promise<EmployeeRequest[]> {
    const rows = await this.prisma.employeeRequest.findMany({
      where: { OR: [{ status: 'APPROVED' as any }, { status: 'REJECTED' as any }] },
      skip: offset,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { requestedBySupervisor: true, resolvedByAdmin: true },
    });
    return Promise.all(rows.map((r) => this.toDomain(r)));
  }
}
