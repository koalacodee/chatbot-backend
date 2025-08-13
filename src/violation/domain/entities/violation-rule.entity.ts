import { UUID } from 'src/shared/value-objects/uuid.vo';
import { Violation } from './violation.entity';

enum ViolationType {
  SPEEDING = 'SPEEDING',
  MISSED_MAINTENANCE = 'MISSED_MAINTENANCE',
}

interface ViolationRuleOption {
  id: string;
  type: ViolationType;
  threshold: number;
  fineAmount: number;
  description: string;
  isEnabled: boolean;
}

export class ViolationRule {
  private readonly _id: UUID;
  private _type: ViolationType;
  private _threshold: number;
  private _fineAmount: number;
  private _description: string;
  private _isEnabled: boolean;
  private _violations: Violation[];

  private constructor(options: ViolationRuleOption) {
    this._id = UUID.create(options.id);
    this._type = options.type;
    this._threshold = options.threshold;
    this._fineAmount = options.fineAmount;
    this._description = options.description;
    this._isEnabled = options.isEnabled;
    this._violations = [];
  }

  public static create(options: ViolationRuleOption): ViolationRule {
    return new ViolationRule(options);
  }

  public get id(): string {
    return this._id.value;
  }

  public get type(): ViolationType {
    return this._type;
  }

  public set type(value: ViolationType) {
    this._type = value;
  }

  public get threshold(): number {
    return this._threshold;
  }

  public set threshold(value: number) {
    this._threshold = value;
  }

  public get fineAmount(): number {
    return this._fineAmount;
  }

  public set fineAmount(value: number) {
    this._fineAmount = value;
  }

  public get description(): string {
    return this._description;
  }

  public set description(value: string) {
    this._description = value;
  }

  public get isEnabled(): boolean {
    return this._isEnabled;
  }

  public set isEnabled(value: boolean) {
    this._isEnabled = value;
  }

  public get violations(): Violation[] {
    return this._violations;
  }

  public set violations(value: Violation[]) {
    this._violations = value;
  }

  public toJSON() {
    return {
      id: this.id,
      type: this.type,
      threshold: this.threshold,
      fineAmount: this.fineAmount,
      description: this.description,
      isEnabled: this.isEnabled,
      violations: this.violations,
    };
  }
}
