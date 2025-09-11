import {
  Controller,
  Get,
  Patch,
  Put,
  Param,
  ParseIntPipe,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  // GET /admin/users?q=&skip=0&take=20
  @Get()
  async list(
    @Query('q') q = '',
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

  // PATCH /admin/users/:id/role  { role, add }
  @Patch(':id/role')
  async toggleRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { role: 'ADMIN' | 'RESTAURANT_OWNER' | 'USER'; add: boolean },
  ) {
    return this.admin.toggleOneRole(id, body.role, body.add);
  }

  // PUT /admin/users/:id/roles   { roles: [...] }
  @Put(':id/roles')
  async setRoles(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { roles: ('ADMIN' | 'RESTAURANT_OWNER' | 'USER')[] },
  ) {
    return this.admin.setRoles(id, body.roles);
  }
}
