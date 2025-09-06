import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const user = req.user; // musi być ustawione przez Twój JwtAuthGuard
    const restaurantId = Number(req.params.id);

    if (!user) throw new ForbiddenException('Unauthenticated');
    if (!Number.isFinite(restaurantId))
      throw new ForbiddenException('Invalid restaurant id');

    // ADMIN ma pełny dostęp
    if (Array.isArray(user.roles) && user.roles.includes('ADMIN')) return true;

    // Sprawdź właściciela restauracji
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!r) throw new ForbiddenException('Restaurant not found');
    if (r.ownerId !== user.id) throw new ForbiddenException('No access');

    return true;
  }
}
