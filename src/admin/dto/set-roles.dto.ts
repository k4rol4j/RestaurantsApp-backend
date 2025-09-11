import { ArrayNotEmpty, IsArray, IsIn } from 'class-validator';

const ALLOWED = ['USER', 'RESTAURANT_OWNER', 'ADMIN'] as const;
export type RoleLiteral = (typeof ALLOWED)[number];

export class SetRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsIn(ALLOWED, { each: true })
  roles: RoleLiteral[];
}
