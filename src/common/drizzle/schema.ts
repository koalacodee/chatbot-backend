import {
  pgTable,
  varchar,
  timestamp,
  text,
  integer,
  uniqueIndex,
  foreignKey,
  uuid,
  index,
  date,
  boolean,
  jsonb,
  doublePrecision,
  char,
  primaryKey,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

export const activityLogType = pgEnum('ActivityLogType', [
  'ticket_answered',
  'task_performed',
  'task_approved',
  'faq_created',
  'faq_updated',
  'promotion_created',
  'staff_request_created',
]);
export const adminPermissions = pgEnum('AdminPermissions', [
  'view_analytics',
  'manage_sub_departments',
  'manage_promotions',
  'view_user_activity',
  'manage_staff_directly',
  'manage_tasks',
  'manage_attachment_groups',
]);
export const departmentVisibility = pgEnum('DepartmentVisibility', [
  'public',
  'private',
]);
export const exportType = pgEnum('ExportType', ['csv', 'json']);
export const ticketStatus = pgEnum('TicketStatus', [
  'PENDING',
  'IN_PROGRESS',
  'CLOSED',
]);
export const translationLanguage = pgEnum('TranslationLanguage', [
  'en',
  'es',
  'fr',
  'de',
  'ar',
  'pt',
  'ru',
  'zh',
  'ja',
  'tr',
]);
export const audienceType = pgEnum('audience_type', [
  'customer',
  'supervisor',
  'employee',
  'all',
]);
export const interactionType = pgEnum('interaction_type', [
  'satisfaction',
  'dissatisfaction',
  'view',
]);
export const permissions = pgEnum('permissions', [
  'handle_tickets',
  'handle_tasks',
  'add_faqs',
  'view_analytics',
  'close_tickets',
  'manage_knowledge_chunks',
  'manage_attachment_groups',
]);
export const rating = pgEnum('rating', ['satisfaction', 'dissatisfaction']);
export const requestStatus = pgEnum('request_status', [
  'pending',
  'approved',
  'rejected',
]);
export const supportTicketInteractionType = pgEnum(
  'support_ticket_interaction_type',
  ['satisfaction', 'dissatisfaction'],
);
export const supportTicketStatus = pgEnum('support_ticket_status', [
  'new',
  'seen',
  'answered',
  'closed',
]);
export const taskAssignmentType = pgEnum('task_assignment_type', [
  'individual',
  'department',
  'sub_department',
]);
export const taskAttachmentType = pgEnum('task_attachment_type', [
  'assigner',
  'assignee',
]);
export const taskPriority = pgEnum('task_priority', ['low', 'medium', 'high']);
export const taskStatus = pgEnum('task_status', [
  'to_do',
  'seen',
  'pending_review',
  'completed',
]);
export const taskSubmissionStatus = pgEnum('task_submission_status', [
  'submitted',
  'approved',
  'rejected',
]);
export const userRole = pgEnum('user_role', [
  'supervisor',
  'admin',
  'employee',
  'driver',
]);
export const vehicleLicenseStatus = pgEnum('vehicle_license_status', [
  'active',
  'expiring_soon',
  'expired',
]);
export const vehicleStatus = pgEnum('vehicle_status', [
  'active',
  'in_maintenance',
  'out_of_service',
]);
export const violationType = pgEnum('violation_type', [
  'speeding',
  'missed_maintenance',
]);

export const prismaMigrations = pgTable('_prisma_migrations', {
  id: varchar({ length: 36 }).primaryKey().notNull(),
  checksum: varchar({ length: 64 }).notNull(),
  finishedAt: timestamp('finished_at', { withTimezone: true, mode: 'string' }),
  migrationName: varchar('migration_name', { length: 255 }).notNull(),
  logs: text(),
  rolledBackAt: timestamp('rolled_back_at', {
    withTimezone: true,
    mode: 'string',
  }),
  startedAt: timestamp('started_at', { withTimezone: true, mode: 'string' })
    .defaultNow()
    .notNull(),
  appliedStepsCount: integer('applied_steps_count').default(0).notNull(),
});

export const admins = pgTable(
  'admins',
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
  },
  (table) => [
    uniqueIndex('admins_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'admins_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const departments = pgTable(
  'departments',
  {
    id: uuid().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    parentId: uuid('parent_id'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    visibility: departmentVisibility().default('public').notNull(),
  },
  (table) => [
    index('departments_parent_id_idx').using(
      'btree',
      table.parentId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: 'departments_parent_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const employeeSubDepartments = pgTable(
  'employee_sub_departments',
  {
    id: uuid().primaryKey().notNull(),
    employeeId: uuid('employee_id').notNull(),
    departmentId: uuid('department_id').notNull(),
    assignedAt: timestamp('assigned_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('employee_sub_departments_department_id_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('employee_sub_departments_employee_id_department_id_key').using(
      'btree',
      table.employeeId.asc().nullsLast().op('uuid_ops'),
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('employee_sub_departments_employee_id_idx').using(
      'btree',
      table.employeeId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: 'employee_sub_departments_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.employeeId],
      foreignColumns: [employees.id],
      name: 'employee_sub_departments_employee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const knowledgeChunks = pgTable(
  'knowledge_chunks',
  {
    id: uuid().primaryKey().notNull(),
    content: text().notNull(),
    departmentId: uuid('department_id').notNull(),
    pointId: uuid('point_id'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('knowledge_chunks_department_id_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('knowledge_chunks_point_id_idx').using(
      'btree',
      table.pointId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: 'knowledge_chunks_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const drivers = pgTable(
  'drivers',
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    drivingLicenseExpiry: date('driving_license_expiry').notNull(),
    licensingNumber: varchar('licensing_number', { length: 255 }).notNull(),
    supervisorId: uuid('supervisor_id').notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('drivers_licensing_number_key').using(
      'btree',
      table.licensingNumber.asc().nullsLast().op('text_ops'),
    ),
    index('drivers_supervisor_id_idx').using(
      'btree',
      table.supervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('drivers_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisors.id],
      name: 'drivers_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'drivers_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid().primaryKey().notNull(),
    content: text().notNull(),
    conversationId: uuid('conversation_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    role: varchar({ length: 20 }).notNull(),
  },
  (table) => [
    index('messages_conversation_id_idx').using(
      'btree',
      table.conversationId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.conversationId],
      foreignColumns: [conversations.id],
      name: 'messages_conversation_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const profilePictures = pgTable(
  'profile_pictures',
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    filename: varchar({ length: 255 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('profile_pictures_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'profile_pictures_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const attachmentGroups = pgTable(
  'attachment_groups',
  {
    id: uuid().primaryKey().notNull(),
    createdById: uuid('created_by_id').notNull(),
    key: varchar({ length: 255 }).notNull(),
    ips: varchar({ length: 255 }).array(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    expiresAt: timestamp('expires_at', { precision: 3, mode: 'string' }),
  },
  (table) => [
    index('attachment_groups_created_by_id_idx').using(
      'btree',
      table.createdById.asc().nullsLast().op('uuid_ops'),
    ),
    index('attachment_groups_key_idx').using(
      'btree',
      table.key.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.createdById],
      foreignColumns: [users.id],
      name: 'attachment_groups_created_by_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const promotions = pgTable(
  'promotions',
  {
    id: uuid().primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    audience: audienceType().notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    startDate: timestamp('start_date', { precision: 3, mode: 'string' }),
    endDate: timestamp('end_date', { precision: 3, mode: 'string' }),
    createdByAdminId: uuid('created_by_admin_id'),
    createdBySupervisorId: uuid('created_by_supervisor_id'),
  },
  (table) => [
    index(
      'promotions_created_by_admin_id_is_active_created_by_supervi_idx',
    ).using(
      'btree',
      table.createdByAdminId.asc().nullsLast().op('uuid_ops'),
      table.isActive.asc().nullsLast().op('bool_ops'),
      table.createdBySupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.createdByAdminId],
      foreignColumns: [admins.id],
      name: 'promotions_created_by_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.createdBySupervisorId],
      foreignColumns: [supervisors.id],
      name: 'promotions_created_by_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const attachments = pgTable(
  'attachments',
  {
    id: uuid().primaryKey().notNull(),
    type: varchar({ length: 255 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    targetId: uuid('target_id'),
    expirationDate: timestamp('expiration_date', {
      precision: 3,
      mode: 'string',
    }),
    originalName: varchar('original_name', { length: 500 }).notNull(),
    filename: varchar({ length: 500 }).notNull(),
    guestId: uuid('guest_id'),
    userId: uuid('user_id'),
    isGlobal: boolean('is_global').default(false).notNull(),
    size: integer().default(0).notNull(),
    cloned: boolean().default(false).notNull(),
  },
  (table) => [
    index('attachments_cloned_idx').using(
      'btree',
      table.cloned.asc().nullsLast().op('bool_ops'),
    ),
    index('attachments_guest_id_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    index('attachments_is_global_idx').using(
      'btree',
      table.isGlobal.asc().nullsLast().op('bool_ops'),
    ),
    index('attachments_target_id_idx').using(
      'btree',
      table.targetId.asc().nullsLast().op('uuid_ops'),
    ),
    index('attachments_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
  ],
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid().primaryKey().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    userId: uuid('user_id').notNull(),
    itemId: varchar('item_id', { length: 255 }).notNull(),
    meta: jsonb().notNull(),
    title: text().notNull(),
    type: activityLogType().notNull(),
    occurredAt: timestamp('occurred_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('activity_logs_occurred_at_idx').using(
      'btree',
      table.occurredAt.asc().nullsLast().op('timestamp_ops'),
    ),
    index('activity_logs_type_idx').using(
      'btree',
      table.type.asc().nullsLast().op('enum_ops'),
    ),
    index('activity_logs_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'activity_logs_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const guests = pgTable(
  'guests',
  {
    id: uuid().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    phone: varchar({ length: 255 }),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('guests_email_key').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('guests_phone_key').using(
      'btree',
      table.phone.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const conversations = pgTable(
  'conversations',
  {
    id: uuid().primaryKey().notNull(),
    guestId: uuid('guest_id'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    startedAt: timestamp('started_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    endedAt: timestamp('ended_at', { precision: 3, mode: 'string' }),
    isDeleted: boolean('is_deleted').default(false).notNull(),
    anonymousId: uuid('anonymous_id'),
  },
  (table) => [
    index('conversations_guest_id_is_deleted_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('bool_ops'),
      table.isDeleted.asc().nullsLast().op('bool_ops'),
    ),
    foreignKey({
      columns: [table.guestId],
      foreignColumns: [guests.id],
      name: 'conversations_guest_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const employeeRequests = pgTable(
  'employee_requests',
  {
    id: uuid().primaryKey().notNull(),
    requestedBySupervisorId: uuid('requested_by_supervisor_id').notNull(),
    newEmployeeEmail: varchar('new_employee_email', { length: 255 }).notNull(),
    newEmployeeFullName: varchar('new_employee_full_name', {
      length: 255,
    }).notNull(),
    newEmployeeDesignation: varchar('new_employee_designation', {
      length: 255,
    }),
    status: requestStatus().default('pending').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    resolvedAt: timestamp('resolved_at', { precision: 3, mode: 'string' }),
    resolvedByAdminId: uuid('resolved_by_admin_id'),
    rejectionReason: text('rejection_reason'),
    acknowledgedBySupervisor: boolean('acknowledged_by_supervisor')
      .default(false)
      .notNull(),
    newEmployeeJobTitle: varchar('new_employee_job_title', {
      length: 255,
    }).notNull(),
    newEmployeeUsername: varchar('new_employee_username', {
      length: 255,
    }).notNull(),
    temporaryPassword: varchar('temporary_password', { length: 255 }).notNull(),
    newEmployeeId: varchar('new_employee_id', { length: 255 }),
  },
  (table) => [
    index('employee_requests_requested_by_supervisor_id_idx').using(
      'btree',
      table.requestedBySupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('employee_requests_resolved_by_admin_id_status_idx').using(
      'btree',
      table.resolvedByAdminId.asc().nullsLast().op('uuid_ops'),
      table.status.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.requestedBySupervisorId],
      foreignColumns: [supervisors.id],
      name: 'employee_requests_requested_by_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('restrict'),
    foreignKey({
      columns: [table.resolvedByAdminId],
      foreignColumns: [admins.id],
      name: 'employee_requests_resolved_by_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const employees = pgTable(
  'employees',
  {
    id: uuid().primaryKey().notNull(),
    userId: uuid('user_id').notNull(),
    permissions: permissions().array(),
    supervisorId: uuid('supervisor_id').notNull(),
  },
  (table) => [
    uniqueIndex('employees_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.supervisorId],
      foreignColumns: [supervisors.id],
      name: 'employees_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'employees_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const notifications = pgTable('notifications', {
  id: uuid().primaryKey().notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at', {
    precision: 3,
    mode: 'string',
  }).notNull(),
  title: varchar({ length: 255 }).notNull(),
  type: varchar({ length: 255 }).notNull(),
});

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: uuid().primaryKey().notNull(),
    userId: varchar('user_id', { length: 255 }).notNull(),
    endpoint: text().notNull(),
    expirationTime: timestamp('expiration_time', {
      precision: 3,
      mode: 'string',
    }),
    keys: jsonb().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('push_subscriptions_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const questionViews = pgTable(
  'question_views',
  {
    id: uuid().primaryKey().notNull(),
    questionId: uuid('question_id').notNull(),
    guestId: uuid('guest_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('question_views_guest_id_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('question_views_question_id_guest_id_key').using(
      'btree',
      table.questionId.asc().nullsLast().op('uuid_ops'),
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    index('question_views_question_id_idx').using(
      'btree',
      table.questionId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.questionId],
      foreignColumns: [questions.id],
      name: 'question_views_question_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().primaryKey().notNull(),
    token: text().notNull(),
    expiresAt: timestamp('expires_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    revokedAt: timestamp('revoked_at', { precision: 3, mode: 'string' }),
    targetId: uuid('target_id').notNull(),
  },
  (table) => [
    index('refresh_tokens_token_idx').using(
      'btree',
      table.token.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const questions = pgTable(
  'questions',
  {
    id: uuid().primaryKey().notNull(),
    text: text().notNull(),
    answer: text(),
    departmentId: uuid('department_id').notNull(),
    knowledgeChunkId: uuid('knowledge_chunk_id'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    creatorSupervisorId: uuid('creator_supervisor_id'),
    creatorAdminId: uuid('creator_admin_id'),
    creatorEmployeeId: uuid('creator_employee_id'),
    dissatisfaction: integer().default(0).notNull(),
    satisfaction: integer().default(0).notNull(),
    views: integer().default(0).notNull(),
    availableLangs: text('available_langs').array().default(['RAY']),
  },
  (table) => [
    index('questions_creator_supervisor_id_idx').using(
      'btree',
      table.creatorSupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('questions_department_id_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('questions_department_id_views_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('int4_ops'),
      table.views.asc().nullsLast().op('uuid_ops'),
    ),
    index('questions_views_idx').using(
      'btree',
      table.views.asc().nullsLast().op('int4_ops'),
    ),
    foreignKey({
      columns: [table.creatorAdminId],
      foreignColumns: [admins.id],
      name: 'questions_creator_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.creatorEmployeeId],
      foreignColumns: [employees.id],
      name: 'questions_creator_employee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.creatorSupervisorId],
      foreignColumns: [supervisors.id],
      name: 'questions_creator_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: 'questions_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.knowledgeChunkId],
      foreignColumns: [knowledgeChunks.id],
      name: 'questions_knowledge_chunk_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const supervisors = pgTable(
  'supervisors',
  {
    id: uuid().primaryKey().notNull(),
    permissions: adminPermissions().array(),
    userId: uuid('user_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('supervisors_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('supervisors_user_id_key').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'supervisors_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const recipientNotifications = pgTable(
  'recipient_notifications',
  {
    id: uuid().primaryKey().notNull(),
    seen: boolean().default(false).notNull(),
    userId: uuid('user_id').notNull(),
    notificationId: uuid('notification_id').notNull(),
  },
  (table) => [
    index('recipient_notifications_notification_id_idx').using(
      'btree',
      table.notificationId.asc().nullsLast().op('uuid_ops'),
    ),
    index('recipient_notifications_seen_idx').using(
      'btree',
      table.seen.asc().nullsLast().op('bool_ops'),
    ),
    index('recipient_notifications_user_id_idx').using(
      'btree',
      table.userId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.notificationId],
      foreignColumns: [notifications.id],
      name: 'recipient_notifications_notification_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: 'recipient_notifications_user_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const retrievedChunks = pgTable(
  'retrieved_chunks',
  {
    id: uuid().primaryKey().notNull(),
    messageId: uuid('message_id').notNull(),
    knowledgeChunkId: uuid('knowledge_chunk_id').notNull(),
    score: doublePrecision().notNull(),
    retrievedAt: timestamp('retrieved_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('retrieved_chunks_knowledge_chunk_id_idx').using(
      'btree',
      table.knowledgeChunkId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('retrieved_chunks_message_id_key').using(
      'btree',
      table.messageId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.knowledgeChunkId],
      foreignColumns: [knowledgeChunks.id],
      name: 'retrieved_chunks_knowledge_chunk_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messages.id],
      name: 'retrieved_chunks_message_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const supportTicketInteractions = pgTable(
  'support_ticket_interactions',
  {
    id: uuid().primaryKey().notNull(),
    supportTicketId: uuid('support_ticket_id').notNull(),
    guestId: uuid('guest_id'),
    type: supportTicketInteractionType().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    anonymousId: uuid('anonymous_id'),
  },
  (table) => [
    index('support_ticket_interactions_anonymous_id_idx').using(
      'btree',
      table.anonymousId.asc().nullsLast().op('uuid_ops'),
    ),
    index('support_ticket_interactions_guest_id_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    index('support_ticket_interactions_support_ticket_id_idx').using(
      'btree',
      table.supportTicketId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('support_ticket_interactions_support_ticket_id_key').using(
      'btree',
      table.supportTicketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.guestId],
      foreignColumns: [guests.id],
      name: 'support_ticket_interactions_guest_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.supportTicketId],
      foreignColumns: [supportTickets.id],
      name: 'support_ticket_interactions_support_ticket_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const supportTicketAnswers = pgTable(
  'support_ticket_answers',
  {
    id: uuid().primaryKey().notNull(),
    supportTicketId: uuid('support_ticket_id').notNull(),
    content: text().notNull(),
    answererSupervisorId: uuid('answerer_supervisor_id'),
    answererEmployeeId: uuid('answerer_employee_id'),
    answererAdminId: uuid('answerer_admin_id'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    rating: rating(),
  },
  (table) => [
    index(
      'support_ticket_answers_answerer_supervisor_id_answerer_empl_idx',
    ).using(
      'btree',
      table.answererSupervisorId.asc().nullsLast().op('uuid_ops'),
      table.answererEmployeeId.asc().nullsLast().op('uuid_ops'),
      table.answererAdminId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('support_ticket_answers_support_ticket_id_key').using(
      'btree',
      table.supportTicketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.answererAdminId],
      foreignColumns: [admins.id],
      name: 'support_ticket_answers_answerer_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.answererEmployeeId],
      foreignColumns: [employees.id],
      name: 'support_ticket_answers_answerer_employee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.answererSupervisorId],
      foreignColumns: [supervisors.id],
      name: 'support_ticket_answers_answerer_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.supportTicketId],
      foreignColumns: [supportTickets.id],
      name: 'support_ticket_answers_support_ticket_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const supportTickets = pgTable(
  'support_tickets',
  {
    id: uuid().primaryKey().notNull(),
    subject: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    departmentId: uuid('department_id').notNull(),
    status: supportTicketStatus().default('new').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    answeredAt: timestamp('answered_at', { precision: 3, mode: 'string' }),
    assigneeId: uuid('assignee_id'),
    code: varchar({ length: 10 }).notNull(),
    guestEmail: varchar('guest_email', { length: 255 }).notNull(),
    guestName: varchar('guest_name', { length: 255 }).notNull(),
    guestPhone: varchar('guest_phone', { length: 255 }).notNull(),
  },
  (table) => [
    index('idx_support_tickets_subject_lower').using(
      'btree',
      sql`lower(TRIM(BOTH FROM subject))`,
    ),
    uniqueIndex('support_tickets_code_key').using(
      'btree',
      table.code.asc().nullsLast().op('text_ops'),
    ),
    index('support_tickets_department_id_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('support_tickets_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
    ),
    foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [employees.id],
      name: 'support_tickets_assignee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: 'support_tickets_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const taskPresets = pgTable(
  'task_presets',
  {
    id: uuid().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    dueDate: timestamp('due_date', { precision: 3, mode: 'string' }),
    assigneeId: uuid('assignee_id'),
    assignerId: uuid('assigner_id').notNull(),
    assignerRole: varchar('assigner_role', { length: 20 }).notNull(),
    approverId: uuid('approver_id'),
    assignmentType: taskAssignmentType('assignment_type').notNull(),
    priority: taskPriority().default('medium').notNull(),
    targetDepartmentId: uuid('target_department_id'),
    targetSubDepartmentId: uuid('target_sub_department_id'),
    reminderInterval: integer('reminder_interval'),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('task_presets_assigner_id_idx').using(
      'btree',
      table.assignerId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_presets_assigner_role_idx').using(
      'btree',
      table.assignerRole.asc().nullsLast().op('text_ops'),
    ),
    index('task_presets_name_idx').using(
      'btree',
      table.name.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const taskSubmissions = pgTable(
  'task_submissions',
  {
    id: uuid().primaryKey().notNull(),
    taskId: uuid('task_id').notNull(),
    performerAdminId: uuid('performer_admin_id'),
    performerSupervisorId: uuid('performer_supervisor_id'),
    performerEmployeeId: uuid('performer_employee_id'),
    notes: text(),
    feedback: text(),
    status: taskSubmissionStatus().default('submitted').notNull(),
    submittedAt: timestamp('submitted_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { precision: 3, mode: 'string' }),
    reviewedByAdminId: uuid('reviewed_by_admin_id'),
    reviewedBySupervisorId: uuid('reviewed_by_supervisor_id'),
    delegationSubmissionId: uuid('delegation_submission_id'),
  },
  (table) => [
    index('task_submissions_performer_admin_id_idx').using(
      'btree',
      table.performerAdminId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_submissions_performer_employee_id_idx').using(
      'btree',
      table.performerEmployeeId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_submissions_performer_supervisor_id_idx').using(
      'btree',
      table.performerSupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index(
      'task_submissions_reviewed_by_admin_id_reviewed_by_superviso_idx',
    ).using(
      'btree',
      table.reviewedByAdminId.asc().nullsLast().op('uuid_ops'),
      table.reviewedBySupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_submissions_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
    ),
    index('task_submissions_task_id_idx').using(
      'btree',
      table.taskId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.performerAdminId],
      foreignColumns: [admins.id],
      name: 'task_submissions_performer_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.performerEmployeeId],
      foreignColumns: [employees.id],
      name: 'task_submissions_performer_employee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.performerSupervisorId],
      foreignColumns: [supervisors.id],
      name: 'task_submissions_performer_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.reviewedByAdminId],
      foreignColumns: [admins.id],
      name: 'task_submissions_reviewed_by_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.reviewedBySupervisorId],
      foreignColumns: [supervisors.id],
      name: 'task_submissions_reviewed_by_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: 'task_submissions_task_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.delegationSubmissionId],
      foreignColumns: [taskDelegationSubmissions.id],
      name: 'task_submissions_delegation_submission_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
  ],
);

export const tickets = pgTable(
  'tickets',
  {
    id: uuid().primaryKey().notNull(),
    guestId: uuid('guest_id'),
    question: text().notNull(),
    departmentId: uuid('department_id').notNull(),
    pointId: uuid('point_id'),
    ticketCode: varchar('ticket_code', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    status: ticketStatus().default('PENDING').notNull(),
    isAutoGenerated: boolean('is_auto_generated').default(true).notNull(),
  },
  (table) => [
    index('tickets_department_id_idx').using(
      'btree',
      table.departmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tickets_guest_id_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tickets_point_id_is_auto_generated_idx').using(
      'btree',
      table.pointId.asc().nullsLast().op('uuid_ops'),
      table.isAutoGenerated.asc().nullsLast().op('bool_ops'),
    ),
    uniqueIndex('tickets_ticket_code_key').using(
      'btree',
      table.ticketCode.asc().nullsLast().op('text_ops'),
    ),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: 'tickets_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.guestId],
      foreignColumns: [guests.id],
      name: 'tickets_guest_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const vehicles = pgTable(
  'vehicles',
  {
    id: uuid().primaryKey().notNull(),
    make: varchar({ length: 255 }).notNull(),
    model: varchar({ length: 255 }).notNull(),
    year: integer().notNull(),
    plateNumber: varchar('plate_number', { length: 255 }).notNull(),
    vin: varchar({ length: 255 }).notNull(),
    status: vehicleStatus().default('active').notNull(),
    driverId: uuid('driver_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    notes: text(),
    nextMaintenanceDate: timestamp('next_maintenance_date', {
      precision: 3,
      mode: 'string',
    }),
  },
  (table) => [
    index('vehicles_driver_id_status_idx').using(
      'btree',
      table.driverId.asc().nullsLast().op('uuid_ops'),
      table.status.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.driverId],
      foreignColumns: [drivers.id],
      name: 'vehicles_driver_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const vehicleLicenses = pgTable(
  'vehicle_licenses',
  {
    id: uuid().primaryKey().notNull(),
    vehicleId: uuid('vehicle_id').notNull(),
    licenseNumber: varchar('license_number', { length: 255 }).notNull(),
    issueDate: timestamp('issue_date', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    expiryDate: timestamp('expiry_date', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    insurancePolicyNumber: varchar('insurance_policy_number', { length: 255 }),
    insuranceExpiryDate: timestamp('insurance_expiry_date', {
      precision: 3,
      mode: 'string',
    }),
    status: vehicleLicenseStatus(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('vehicle_licenses_vehicle_id_key').using(
      'btree',
      table.vehicleId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.vehicleId],
      foreignColumns: [vehicles.id],
      name: 'vehicle_licenses_vehicle_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const translations = pgTable(
  'translations',
  {
    id: uuid().primaryKey().notNull(),
    lang: translationLanguage().notNull(),
    content: text().notNull(),
    targetId: uuid('target_id').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    subTarget: varchar('sub_target', { length: 255 }),
  },
  (table) => [
    index('translations_lang_idx').using(
      'btree',
      table.lang.asc().nullsLast().op('enum_ops'),
    ),
    index('translations_target_id_idx').using(
      'btree',
      table.targetId.asc().nullsLast().op('uuid_ops'),
    ),
  ],
);

export const violationRules = pgTable('violation_rules', {
  id: uuid().primaryKey().notNull(),
  type: violationType().notNull(),
  threshold: integer().notNull(),
  fineAmount: integer('fine_amount').notNull(),
  description: text().notNull(),
  isEnabled: boolean('is_enabled').default(true).notNull(),
  createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp('updated_at', {
    precision: 3,
    mode: 'string',
  }).notNull(),
});

export const tasks = pgTable(
  'tasks',
  {
    id: uuid().primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text().notNull(),
    assigneeId: uuid('assignee_id'),
    status: taskStatus().default('to_do').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    completedAt: timestamp('completed_at', { precision: 3, mode: 'string' }),
    assignmentType: taskAssignmentType('assignment_type').notNull(),
    targetDepartmentId: uuid('target_department_id'),
    targetSubDepartmentId: uuid('target_sub_department_id'),
    assignerAdminId: uuid('assigner_admin_id'),
    assignerSupervisorId: uuid('assigner_supervisor_id'),
    priority: taskPriority().default('medium').notNull(),
    dueDate: timestamp('due_date', { precision: 3, mode: 'string' }),
    reminderInterval: integer('reminder_interval'),
    creatorId: uuid('creator_id'),
  },
  (table) => [
    index('tasks_assignee_id_idx').using(
      'btree',
      table.assigneeId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tasks_assigner_admin_id_idx').using(
      'btree',
      table.assignerAdminId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tasks_assigner_supervisor_id_idx').using(
      'btree',
      table.assignerSupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tasks_priority_idx').using(
      'btree',
      table.priority.asc().nullsLast().op('enum_ops'),
    ),
    index('tasks_target_department_id_idx').using(
      'btree',
      table.targetDepartmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('tasks_target_sub_department_id_idx').using(
      'btree',
      table.targetSubDepartmentId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [employees.id],
      name: 'tasks_assignee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.assignerAdminId],
      foreignColumns: [admins.id],
      name: 'tasks_assigner_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.assignerSupervisorId],
      foreignColumns: [supervisors.id],
      name: 'tasks_assigner_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.targetDepartmentId],
      foreignColumns: [departments.id],
      name: 'tasks_target_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.targetSubDepartmentId],
      foreignColumns: [departments.id],
      name: 'tasks_target_sub_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.creatorId],
      foreignColumns: [users.id],
      name: 'tasks_creator_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }).notNull(),
    password: char({ length: 97 }).notNull(),
    role: userRole().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    employeeId: varchar('employee_id', { length: 255 }),
    jobTitle: varchar('job_title', { length: 255 }),
    username: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    uniqueIndex('users_email_key').using(
      'btree',
      table.email.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('users_employee_id_key').using(
      'btree',
      table.employeeId.asc().nullsLast().op('text_ops'),
    ),
    uniqueIndex('users_username_key').using(
      'btree',
      table.username.asc().nullsLast().op('text_ops'),
    ),
  ],
);

export const questionInteractions = pgTable(
  'question_interactions',
  {
    id: uuid().primaryKey().notNull(),
    type: interactionType().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    questionId: uuid('question_id').notNull(),
    guestId: uuid('guest_id').notNull(),
  },
  (table) => [
    index('question_interactions_guest_id_idx').using(
      'btree',
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    uniqueIndex('question_interactions_question_id_guest_id_key').using(
      'btree',
      table.questionId.asc().nullsLast().op('uuid_ops'),
      table.guestId.asc().nullsLast().op('uuid_ops'),
    ),
    index('question_interactions_question_id_idx').using(
      'btree',
      table.questionId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.questionId],
      foreignColumns: [questions.id],
      name: 'question_interactions_question_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const ticketAnswers = pgTable(
  'ticket_answers',
  {
    id: uuid().primaryKey().notNull(),
    ticketId: uuid('ticket_id').notNull(),
    content: text().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    uniqueIndex('ticket_answers_ticket_id_key').using(
      'btree',
      table.ticketId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.ticketId],
      foreignColumns: [tickets.id],
      name: 'ticket_answers_ticket_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const violations = pgTable(
  'violations',
  {
    id: uuid().primaryKey().notNull(),
    driverId: uuid('driver_id').notNull(),
    vehicleId: uuid('vehicle_id').notNull(),
    ruleId: uuid('rule_id').notNull(),
    description: text().notNull(),
    amount: doublePrecision().notNull(),
    isPaid: boolean('is_paid').default(false).notNull(),
    triggerEventId: varchar('trigger_event_id', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
  },
  (table) => [
    index('violations_driver_id_idx').using(
      'btree',
      table.driverId.asc().nullsLast().op('uuid_ops'),
    ),
    index('violations_rule_id_is_paid_idx').using(
      'btree',
      table.ruleId.asc().nullsLast().op('uuid_ops'),
      table.isPaid.asc().nullsLast().op('bool_ops'),
    ),
    index('violations_vehicle_id_idx').using(
      'btree',
      table.vehicleId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.driverId],
      foreignColumns: [drivers.id],
      name: 'violations_driver_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.ruleId],
      foreignColumns: [violationRules.id],
      name: 'violations_rule_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.vehicleId],
      foreignColumns: [vehicles.id],
      name: 'violations_vehicle_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

// Renamed "exports" to avoid conflict with reserved identifier "exports"
export const exportsTable = pgTable(
  'exports',
  {
    id: uuid().primaryKey().notNull(),
    type: exportType().notNull(),
    objectPath: text('object_path').notNull(),
    size: integer().notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    rows: integer().notNull(),
  },
  (table) => [
    index('exports_type_idx').using(
      'btree',
      table.type.asc().nullsLast().op('enum_ops'),
    ),
  ],
);

export const taskDelegations = pgTable(
  'task_delegations',
  {
    id: uuid().primaryKey().notNull(),
    taskId: uuid('task_id').notNull(),
    assigneeId: uuid('assignee_id'),
    targetSubDepartmentId: uuid('target_sub_department_id').notNull(),
    status: taskStatus().default('to_do').notNull(),
    assignmentType: taskAssignmentType('assignment_type').notNull(),
    createdAt: timestamp('created_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp('updated_at', {
      precision: 3,
      mode: 'string',
    }).notNull(),
    completedAt: timestamp('completed_at', { precision: 3, mode: 'string' }),
    delegatorId: uuid('delegator_id').notNull(),
  },
  (table) => [
    index('task_delegations_assignee_id_idx').using(
      'btree',
      table.assigneeId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegations_delegator_id_idx').using(
      'btree',
      table.delegatorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegations_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
    ),
    index('task_delegations_target_sub_department_id_idx').using(
      'btree',
      table.targetSubDepartmentId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegations_task_id_idx').using(
      'btree',
      table.taskId.asc().nullsLast().op('uuid_ops'),
    ),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: 'task_delegations_task_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.assigneeId],
      foreignColumns: [employees.id],
      name: 'task_delegations_assignee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.targetSubDepartmentId],
      foreignColumns: [departments.id],
      name: 'task_delegations_target_sub_department_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.delegatorId],
      foreignColumns: [supervisors.id],
      name: 'task_delegations_delegator_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const taskDelegationSubmissions = pgTable(
  'task_delegation_submissions',
  {
    id: uuid().primaryKey().notNull(),
    delegationId: uuid('delegation_id').notNull(),
    performerAdminId: uuid('performer_admin_id'),
    performerSupervisorId: uuid('performer_supervisor_id'),
    performerEmployeeId: uuid('performer_employee_id'),
    notes: text(),
    feedback: text(),
    status: taskSubmissionStatus().default('submitted').notNull(),
    submittedAt: timestamp('submitted_at', { precision: 3, mode: 'string' })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    reviewedAt: timestamp('reviewed_at', { precision: 3, mode: 'string' }),
    reviewedByAdminId: uuid('reviewed_by_admin_id'),
    reviewedBySupervisorId: uuid('reviewed_by_supervisor_id'),
    forwarded: boolean().default(false).notNull(),
    taskId: uuid('task_id').notNull(),
  },
  (table) => [
    index('task_delegation_submissions_delegation_id_idx').using(
      'btree',
      table.delegationId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegation_submissions_performer_admin_id_idx').using(
      'btree',
      table.performerAdminId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegation_submissions_performer_employee_id_idx').using(
      'btree',
      table.performerEmployeeId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegation_submissions_performer_supervisor_id_idx').using(
      'btree',
      table.performerSupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index(
      'task_delegation_submissions_reviewed_by_admin_id_reviewed_b_idx',
    ).using(
      'btree',
      table.reviewedByAdminId.asc().nullsLast().op('uuid_ops'),
      table.reviewedBySupervisorId.asc().nullsLast().op('uuid_ops'),
    ),
    index('task_delegation_submissions_status_idx').using(
      'btree',
      table.status.asc().nullsLast().op('enum_ops'),
    ),
    foreignKey({
      columns: [table.delegationId],
      foreignColumns: [taskDelegations.id],
      name: 'task_delegation_submissions_delegation_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.performerAdminId],
      foreignColumns: [admins.id],
      name: 'task_delegation_submissions_performer_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.performerSupervisorId],
      foreignColumns: [supervisors.id],
      name: 'task_delegation_submissions_performer_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.performerEmployeeId],
      foreignColumns: [employees.id],
      name: 'task_delegation_submissions_performer_employee_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.reviewedByAdminId],
      foreignColumns: [admins.id],
      name: 'task_delegation_submissions_reviewed_by_admin_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.reviewedBySupervisorId],
      foreignColumns: [supervisors.id],
      name: 'task_delegation_submissions_reviewed_by_supervisor_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('set null'),
    foreignKey({
      columns: [table.taskId],
      foreignColumns: [tasks.id],
      name: 'task_delegation_submissions_task_id_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
  ],
);

export const departmentToSupervisor = pgTable(
  '_DepartmentToSupervisor',
  {
    a: uuid('A').notNull(),
    b: uuid('B').notNull(),
  },
  (table) => [
    index().using('btree', table.b.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.a],
      foreignColumns: [departments.id],
      name: '_DepartmentToSupervisor_A_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.b],
      foreignColumns: [supervisors.id],
      name: '_DepartmentToSupervisor_B_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.a, table.b],
      name: '_DepartmentToSupervisor_AB_pkey',
    }),
  ],
);

export const attachmentToAttachmentGroup = pgTable(
  '_AttachmentToAttachmentGroup',
  {
    a: uuid('A').notNull(),
    b: uuid('B').notNull(),
  },
  (table) => [
    index().using('btree', table.b.asc().nullsLast().op('uuid_ops')),
    foreignKey({
      columns: [table.a],
      foreignColumns: [attachments.id],
      name: '_AttachmentToAttachmentGroup_A_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    foreignKey({
      columns: [table.b],
      foreignColumns: [attachmentGroups.id],
      name: '_AttachmentToAttachmentGroup_B_fkey',
    })
      .onUpdate('cascade')
      .onDelete('cascade'),
    primaryKey({
      columns: [table.a, table.b],
      name: '_AttachmentToAttachmentGroup_AB_pkey',
    }),
  ],
);
