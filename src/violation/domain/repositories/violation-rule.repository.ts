import { ViolationRule } from '../entities/violation-rule.entity';

export abstract class ViolationRuleRepository {
  abstract save(rule: ViolationRule): Promise<ViolationRule>;
  abstract findById(id: string): Promise<ViolationRule | null>;
  abstract findAll(offset?: number, limit?: number): Promise<ViolationRule[]>;
  abstract removeById(id: string): Promise<ViolationRule | null>;
  abstract exists(id: string): Promise<boolean>;
  abstract count(): Promise<number>;
}
