import { IsString, MinLength, Validate } from 'class-validator';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'containsInviteLinkPlaceholder', async: false })
class ContainsInviteLinkPlaceholder implements ValidatorConstraintInterface {
  validate(value: string) {
    return typeof value === 'string' && value.includes('{{link}}');
  }

  defaultMessage() {
    return 'A mensagem precisa incluir a variável {{link}}';
  }
}

export class UpdateSettingsDto {
  @IsString()
  @MinLength(10)
  @Validate(ContainsInviteLinkPlaceholder)
  inviteMessageTemplate!: string;
}
