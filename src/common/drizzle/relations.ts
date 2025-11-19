import { relations } from "drizzle-orm/relations";
import { users, admins, departments, employeeSubDepartments, employees, knowledgeChunks, supervisors, drivers, conversations, messages, profilePictures, attachmentGroups, promotions, activityLogs, guests, employeeRequests, questions, questionViews, notifications, recipientNotifications, retrievedChunks, supportTicketInteractions, supportTickets, supportTicketAnswers, taskSubmissions, tasks, taskDelegationSubmissions, tickets, vehicles, vehicleLicenses, questionInteractions, ticketAnswers, violations, violationRules, taskDelegations, departmentToSupervisor, attachments, attachmentToAttachmentGroup } from "./schema";

export const adminsRelations = relations(admins, ({one, many}) => ({
	user: one(users, {
		fields: [admins.userId],
		references: [users.id]
	}),
	promotions: many(promotions),
	employeeRequests: many(employeeRequests),
	questions: many(questions),
	supportTicketAnswers: many(supportTicketAnswers),
	taskSubmissions_performerAdminId: many(taskSubmissions, {
		relationName: "taskSubmissions_performerAdminId_admins_id"
	}),
	taskSubmissions_reviewedByAdminId: many(taskSubmissions, {
		relationName: "taskSubmissions_reviewedByAdminId_admins_id"
	}),
	tasks: many(tasks),
	taskDelegationSubmissions_performerAdminId: many(taskDelegationSubmissions, {
		relationName: "taskDelegationSubmissions_performerAdminId_admins_id"
	}),
	taskDelegationSubmissions_reviewedByAdminId: many(taskDelegationSubmissions, {
		relationName: "taskDelegationSubmissions_reviewedByAdminId_admins_id"
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	admins: many(admins),
	drivers: many(drivers),
	profilePictures: many(profilePictures),
	attachmentGroups: many(attachmentGroups),
	activityLogs: many(activityLogs),
	employees: many(employees),
	supervisors: many(supervisors),
	recipientNotifications: many(recipientNotifications),
	tasks: many(tasks),
}));

export const departmentsRelations = relations(departments, ({one, many}) => ({
	department: one(departments, {
		fields: [departments.parentId],
		references: [departments.id],
		relationName: "departments_parentId_departments_id"
	}),
	departments: many(departments, {
		relationName: "departments_parentId_departments_id"
	}),
	employeeSubDepartments: many(employeeSubDepartments),
	knowledgeChunks: many(knowledgeChunks),
	questions: many(questions),
	supportTickets: many(supportTickets),
	tickets: many(tickets),
	tasks_targetDepartmentId: many(tasks, {
		relationName: "tasks_targetDepartmentId_departments_id"
	}),
	tasks_targetSubDepartmentId: many(tasks, {
		relationName: "tasks_targetSubDepartmentId_departments_id"
	}),
	taskDelegations: many(taskDelegations),
	departmentToSupervisors: many(departmentToSupervisor),
}));

export const employeeSubDepartmentsRelations = relations(employeeSubDepartments, ({one}) => ({
	department: one(departments, {
		fields: [employeeSubDepartments.departmentId],
		references: [departments.id]
	}),
	employee: one(employees, {
		fields: [employeeSubDepartments.employeeId],
		references: [employees.id]
	}),
}));

export const employeesRelations = relations(employees, ({one, many}) => ({
	employeeSubDepartments: many(employeeSubDepartments),
	supervisor: one(supervisors, {
		fields: [employees.supervisorId],
		references: [supervisors.id]
	}),
	user: one(users, {
		fields: [employees.userId],
		references: [users.id]
	}),
	questions: many(questions),
	supportTicketAnswers: many(supportTicketAnswers),
	supportTickets: many(supportTickets),
	taskSubmissions: many(taskSubmissions),
	tasks: many(tasks),
	taskDelegations: many(taskDelegations),
	taskDelegationSubmissions: many(taskDelegationSubmissions),
}));

export const knowledgeChunksRelations = relations(knowledgeChunks, ({one, many}) => ({
	department: one(departments, {
		fields: [knowledgeChunks.departmentId],
		references: [departments.id]
	}),
	questions: many(questions),
	retrievedChunks: many(retrievedChunks),
}));

export const driversRelations = relations(drivers, ({one, many}) => ({
	supervisor: one(supervisors, {
		fields: [drivers.supervisorId],
		references: [supervisors.id]
	}),
	user: one(users, {
		fields: [drivers.userId],
		references: [users.id]
	}),
	vehicles: many(vehicles),
	violations: many(violations),
}));

export const supervisorsRelations = relations(supervisors, ({one, many}) => ({
	drivers: many(drivers),
	promotions: many(promotions),
	employeeRequests: many(employeeRequests),
	employees: many(employees),
	questions: many(questions),
	user: one(users, {
		fields: [supervisors.userId],
		references: [users.id]
	}),
	supportTicketAnswers: many(supportTicketAnswers),
	taskSubmissions_performerSupervisorId: many(taskSubmissions, {
		relationName: "taskSubmissions_performerSupervisorId_supervisors_id"
	}),
	taskSubmissions_reviewedBySupervisorId: many(taskSubmissions, {
		relationName: "taskSubmissions_reviewedBySupervisorId_supervisors_id"
	}),
	tasks: many(tasks),
	taskDelegations: many(taskDelegations),
	taskDelegationSubmissions_performerSupervisorId: many(taskDelegationSubmissions, {
		relationName: "taskDelegationSubmissions_performerSupervisorId_supervisors_id"
	}),
	taskDelegationSubmissions_reviewedBySupervisorId: many(taskDelegationSubmissions, {
		relationName: "taskDelegationSubmissions_reviewedBySupervisorId_supervisors_id"
	}),
	departmentToSupervisors: many(departmentToSupervisor),
}));

export const messagesRelations = relations(messages, ({one, many}) => ({
	conversation: one(conversations, {
		fields: [messages.conversationId],
		references: [conversations.id]
	}),
	retrievedChunks: many(retrievedChunks),
}));

export const conversationsRelations = relations(conversations, ({one, many}) => ({
	messages: many(messages),
	guest: one(guests, {
		fields: [conversations.guestId],
		references: [guests.id]
	}),
}));

export const profilePicturesRelations = relations(profilePictures, ({one}) => ({
	user: one(users, {
		fields: [profilePictures.userId],
		references: [users.id]
	}),
}));

export const attachmentGroupsRelations = relations(attachmentGroups, ({one, many}) => ({
	user: one(users, {
		fields: [attachmentGroups.createdById],
		references: [users.id]
	}),
	attachmentToAttachmentGroups: many(attachmentToAttachmentGroup),
}));

export const promotionsRelations = relations(promotions, ({one}) => ({
	admin: one(admins, {
		fields: [promotions.createdByAdminId],
		references: [admins.id]
	}),
	supervisor: one(supervisors, {
		fields: [promotions.createdBySupervisorId],
		references: [supervisors.id]
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));

export const guestsRelations = relations(guests, ({many}) => ({
	conversations: many(conversations),
	supportTicketInteractions: many(supportTicketInteractions),
	tickets: many(tickets),
}));

export const employeeRequestsRelations = relations(employeeRequests, ({one}) => ({
	supervisor: one(supervisors, {
		fields: [employeeRequests.requestedBySupervisorId],
		references: [supervisors.id]
	}),
	admin: one(admins, {
		fields: [employeeRequests.resolvedByAdminId],
		references: [admins.id]
	}),
}));

export const questionViewsRelations = relations(questionViews, ({one}) => ({
	question: one(questions, {
		fields: [questionViews.questionId],
		references: [questions.id]
	}),
}));

export const questionsRelations = relations(questions, ({one, many}) => ({
	questionViews: many(questionViews),
	admin: one(admins, {
		fields: [questions.creatorAdminId],
		references: [admins.id]
	}),
	employee: one(employees, {
		fields: [questions.creatorEmployeeId],
		references: [employees.id]
	}),
	supervisor: one(supervisors, {
		fields: [questions.creatorSupervisorId],
		references: [supervisors.id]
	}),
	department: one(departments, {
		fields: [questions.departmentId],
		references: [departments.id]
	}),
	knowledgeChunk: one(knowledgeChunks, {
		fields: [questions.knowledgeChunkId],
		references: [knowledgeChunks.id]
	}),
	questionInteractions: many(questionInteractions),
}));

export const recipientNotificationsRelations = relations(recipientNotifications, ({one}) => ({
	notification: one(notifications, {
		fields: [recipientNotifications.notificationId],
		references: [notifications.id]
	}),
	user: one(users, {
		fields: [recipientNotifications.userId],
		references: [users.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({many}) => ({
	recipientNotifications: many(recipientNotifications),
}));

export const retrievedChunksRelations = relations(retrievedChunks, ({one}) => ({
	knowledgeChunk: one(knowledgeChunks, {
		fields: [retrievedChunks.knowledgeChunkId],
		references: [knowledgeChunks.id]
	}),
	message: one(messages, {
		fields: [retrievedChunks.messageId],
		references: [messages.id]
	}),
}));

export const supportTicketInteractionsRelations = relations(supportTicketInteractions, ({one}) => ({
	guest: one(guests, {
		fields: [supportTicketInteractions.guestId],
		references: [guests.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [supportTicketInteractions.supportTicketId],
		references: [supportTickets.id]
	}),
}));

export const supportTicketsRelations = relations(supportTickets, ({one, many}) => ({
	supportTicketInteractions: many(supportTicketInteractions),
	supportTicketAnswers: many(supportTicketAnswers),
	employee: one(employees, {
		fields: [supportTickets.assigneeId],
		references: [employees.id]
	}),
	department: one(departments, {
		fields: [supportTickets.departmentId],
		references: [departments.id]
	}),
}));

export const supportTicketAnswersRelations = relations(supportTicketAnswers, ({one}) => ({
	admin: one(admins, {
		fields: [supportTicketAnswers.answererAdminId],
		references: [admins.id]
	}),
	employee: one(employees, {
		fields: [supportTicketAnswers.answererEmployeeId],
		references: [employees.id]
	}),
	supervisor: one(supervisors, {
		fields: [supportTicketAnswers.answererSupervisorId],
		references: [supervisors.id]
	}),
	supportTicket: one(supportTickets, {
		fields: [supportTicketAnswers.supportTicketId],
		references: [supportTickets.id]
	}),
}));

export const taskSubmissionsRelations = relations(taskSubmissions, ({one}) => ({
	admin_performerAdminId: one(admins, {
		fields: [taskSubmissions.performerAdminId],
		references: [admins.id],
		relationName: "taskSubmissions_performerAdminId_admins_id"
	}),
	employee: one(employees, {
		fields: [taskSubmissions.performerEmployeeId],
		references: [employees.id]
	}),
	supervisor_performerSupervisorId: one(supervisors, {
		fields: [taskSubmissions.performerSupervisorId],
		references: [supervisors.id],
		relationName: "taskSubmissions_performerSupervisorId_supervisors_id"
	}),
	admin_reviewedByAdminId: one(admins, {
		fields: [taskSubmissions.reviewedByAdminId],
		references: [admins.id],
		relationName: "taskSubmissions_reviewedByAdminId_admins_id"
	}),
	supervisor_reviewedBySupervisorId: one(supervisors, {
		fields: [taskSubmissions.reviewedBySupervisorId],
		references: [supervisors.id],
		relationName: "taskSubmissions_reviewedBySupervisorId_supervisors_id"
	}),
	task: one(tasks, {
		fields: [taskSubmissions.taskId],
		references: [tasks.id]
	}),
	taskDelegationSubmission: one(taskDelegationSubmissions, {
		fields: [taskSubmissions.delegationSubmissionId],
		references: [taskDelegationSubmissions.id]
	}),
}));

export const tasksRelations = relations(tasks, ({one, many}) => ({
	taskSubmissions: many(taskSubmissions),
	employee: one(employees, {
		fields: [tasks.assigneeId],
		references: [employees.id]
	}),
	admin: one(admins, {
		fields: [tasks.assignerAdminId],
		references: [admins.id]
	}),
	supervisor: one(supervisors, {
		fields: [tasks.assignerSupervisorId],
		references: [supervisors.id]
	}),
	department_targetDepartmentId: one(departments, {
		fields: [tasks.targetDepartmentId],
		references: [departments.id],
		relationName: "tasks_targetDepartmentId_departments_id"
	}),
	department_targetSubDepartmentId: one(departments, {
		fields: [tasks.targetSubDepartmentId],
		references: [departments.id],
		relationName: "tasks_targetSubDepartmentId_departments_id"
	}),
	user: one(users, {
		fields: [tasks.creatorId],
		references: [users.id]
	}),
	taskDelegations: many(taskDelegations),
	taskDelegationSubmissions: many(taskDelegationSubmissions),
}));

export const taskDelegationSubmissionsRelations = relations(taskDelegationSubmissions, ({one, many}) => ({
	taskSubmissions: many(taskSubmissions),
	taskDelegation: one(taskDelegations, {
		fields: [taskDelegationSubmissions.delegationId],
		references: [taskDelegations.id]
	}),
	admin_performerAdminId: one(admins, {
		fields: [taskDelegationSubmissions.performerAdminId],
		references: [admins.id],
		relationName: "taskDelegationSubmissions_performerAdminId_admins_id"
	}),
	supervisor_performerSupervisorId: one(supervisors, {
		fields: [taskDelegationSubmissions.performerSupervisorId],
		references: [supervisors.id],
		relationName: "taskDelegationSubmissions_performerSupervisorId_supervisors_id"
	}),
	employee: one(employees, {
		fields: [taskDelegationSubmissions.performerEmployeeId],
		references: [employees.id]
	}),
	admin_reviewedByAdminId: one(admins, {
		fields: [taskDelegationSubmissions.reviewedByAdminId],
		references: [admins.id],
		relationName: "taskDelegationSubmissions_reviewedByAdminId_admins_id"
	}),
	supervisor_reviewedBySupervisorId: one(supervisors, {
		fields: [taskDelegationSubmissions.reviewedBySupervisorId],
		references: [supervisors.id],
		relationName: "taskDelegationSubmissions_reviewedBySupervisorId_supervisors_id"
	}),
	task: one(tasks, {
		fields: [taskDelegationSubmissions.taskId],
		references: [tasks.id]
	}),
}));

export const ticketsRelations = relations(tickets, ({one, many}) => ({
	department: one(departments, {
		fields: [tickets.departmentId],
		references: [departments.id]
	}),
	guest: one(guests, {
		fields: [tickets.guestId],
		references: [guests.id]
	}),
	ticketAnswers: many(ticketAnswers),
}));

export const vehiclesRelations = relations(vehicles, ({one, many}) => ({
	driver: one(drivers, {
		fields: [vehicles.driverId],
		references: [drivers.id]
	}),
	vehicleLicenses: many(vehicleLicenses),
	violations: many(violations),
}));

export const vehicleLicensesRelations = relations(vehicleLicenses, ({one}) => ({
	vehicle: one(vehicles, {
		fields: [vehicleLicenses.vehicleId],
		references: [vehicles.id]
	}),
}));

export const questionInteractionsRelations = relations(questionInteractions, ({one}) => ({
	question: one(questions, {
		fields: [questionInteractions.questionId],
		references: [questions.id]
	}),
}));

export const ticketAnswersRelations = relations(ticketAnswers, ({one}) => ({
	ticket: one(tickets, {
		fields: [ticketAnswers.ticketId],
		references: [tickets.id]
	}),
}));

export const violationsRelations = relations(violations, ({one}) => ({
	driver: one(drivers, {
		fields: [violations.driverId],
		references: [drivers.id]
	}),
	violationRule: one(violationRules, {
		fields: [violations.ruleId],
		references: [violationRules.id]
	}),
	vehicle: one(vehicles, {
		fields: [violations.vehicleId],
		references: [vehicles.id]
	}),
}));

export const violationRulesRelations = relations(violationRules, ({many}) => ({
	violations: many(violations),
}));

export const taskDelegationsRelations = relations(taskDelegations, ({one, many}) => ({
	task: one(tasks, {
		fields: [taskDelegations.taskId],
		references: [tasks.id]
	}),
	employee: one(employees, {
		fields: [taskDelegations.assigneeId],
		references: [employees.id]
	}),
	department: one(departments, {
		fields: [taskDelegations.targetSubDepartmentId],
		references: [departments.id]
	}),
	supervisor: one(supervisors, {
		fields: [taskDelegations.delegatorId],
		references: [supervisors.id]
	}),
	taskDelegationSubmissions: many(taskDelegationSubmissions),
}));

export const departmentToSupervisorRelations = relations(departmentToSupervisor, ({one}) => ({
	department: one(departments, {
		fields: [departmentToSupervisor.a],
		references: [departments.id]
	}),
	supervisor: one(supervisors, {
		fields: [departmentToSupervisor.b],
		references: [supervisors.id]
	}),
}));

export const attachmentToAttachmentGroupRelations = relations(attachmentToAttachmentGroup, ({one}) => ({
	attachment: one(attachments, {
		fields: [attachmentToAttachmentGroup.a],
		references: [attachments.id]
	}),
	attachmentGroup: one(attachmentGroups, {
		fields: [attachmentToAttachmentGroup.b],
		references: [attachmentGroups.id]
	}),
}));

export const attachmentsRelations = relations(attachments, ({many}) => ({
	attachmentToAttachmentGroups: many(attachmentToAttachmentGroup),
}));