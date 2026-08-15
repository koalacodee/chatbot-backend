import { IsNotEmpty, IsString, IsUUID, Length } from 'class-validator';

export class VerifyCodeDto {
  /**
   * The guest the code was issued to. Verification keys are scoped by guest, so the code
   * alone no longer identifies anyone — `register` and `login` both return this id.
   */
  @IsNotEmpty({ message: 'guest_id_required' })
  @IsUUID(undefined, { message: 'guest_id_must_be_uuid' })
  guestId: string;

  @IsNotEmpty({ message: 'code_required' })
  @IsString({ message: 'code_must_be_string' })
  @Length(6, 6, { message: 'code_must_be_6_digits' })
  code: string;
}
