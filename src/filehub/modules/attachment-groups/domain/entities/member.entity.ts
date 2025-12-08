import { UUID } from 'src/shared/value-objects/uuid.vo';
import { AttachmentGroup } from './attachment-group.entity';

export interface AttachmentGroupMemberProps {
  id?: string;
  attachmentGroupId: string;
  attachmentGroup?: AttachmentGroup;
  memberId?: string;
  name: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export class AttachmentGroupMember {
  private readonly _id: UUID;
  private _attachmentGroupId: UUID;
  private _attachmentGroup?: AttachmentGroup;
  private _memberId: UUID;
  private _name: string;
  private _createdAt: Date;
  private _updatedAt: Date;

  private constructor(props: AttachmentGroupMemberProps) {
    this._id = UUID.create(props.id);
    this._attachmentGroupId = UUID.create(props.attachmentGroupId);
    this._attachmentGroup = props.attachmentGroup;
    this._memberId = UUID.create(props.memberId);
    this._name = props.name;
    this._createdAt = props.createdAt ?? new Date();
    this._updatedAt = props.updatedAt ?? new Date();
  }

  public static create(
    props: AttachmentGroupMemberProps,
  ): AttachmentGroupMember {
    return new AttachmentGroupMember(props);
  }

  public get id(): UUID {
    return this._id;
  }

  public get attachmentGroupId(): UUID {
    return this._attachmentGroupId;
  }

  public get attachmentGroup(): AttachmentGroup | undefined {
    return this._attachmentGroup;
  }

  public get memberId(): UUID {
    return this._memberId;
  }

  public get name(): string {
    return this._name;
  }

  public get createdAt(): Date {
    return this._createdAt;
  }

  public get updatedAt(): Date {
    return this._updatedAt;
  }

  public set name(name: string) {
    this._name = name;
  }

  public set updatedAt(updatedAt: Date) {
    this._updatedAt = updatedAt;
  }

  public set attachmentGroup(attachmentGroup: AttachmentGroup | undefined) {
    this._attachmentGroup = attachmentGroup;
  }

  public set memberId(memberId: UUID) {
    this._memberId = memberId;
  }

  public set attachmentGroupId(attachmentGroupId: UUID) {
    this._attachmentGroupId = attachmentGroupId;
  }

  public set createdAt(createdAt: Date) {
    this._createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this._id.value,
      attachmentGroupId: this._attachmentGroupId.value,
      attachmentGroup: this._attachmentGroup.toJSON(),
      memberId: this._memberId.value,
      name: this._name,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }
}
