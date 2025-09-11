import { IsBoolean, IsIn } from 'class-validator';

const ALLOWED = ['USER', 'RESTAURANT_OWNER', 'ADMIN'] as const;
export type RoleLiteral = (typeof ALLOWED)[number];

export class ChangeOneRoleDto {
  @IsIn(ALLOWED)
  role: RoleLiteral;

  @IsBoolean()
  add: boolean;
}
