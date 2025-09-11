import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { SetRolesDto } from './dto/set-roles.dto';
import { ChangeOneRoleDto } from './dto/change-one-role.dto';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  async list(
    @Query('q') q?: string,
    @Query('skip') skip = '0',
    @Query('take') take = '20',
  ) {
    const [items, total] = await this.admin.listUsers(
      q,
      Number(skip),
      Number(take),
    );
    return { items, total };
  }

  @Put(':id/roles')
  setRoles(@Param('id', ParseIntPipe) id: number, @Body() dto: SetRolesDto) {
    return this.admin.setRoles(id, dto.roles as any);
  }

  @Patch(':id/role')
  changeOne(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ChangeOneRoleDto,
  ) {
    return this.admin.changeOneRole(id, dto.role as any, dto.add);
  }
}
