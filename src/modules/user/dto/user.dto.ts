import { Exclude } from 'class-transformer';
import { $Enums } from '@prisma/client';

export class UserDto {
  id: number;
  email: string;
  roles: $Enums.Role[];

  @Exclude()
  createdAt: Date;
  @Exclude()
  password?: string;
}
