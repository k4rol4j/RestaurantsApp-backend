import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RestaurantOwnerGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest<any>();
    const user = req.user; // ustawiane przez JwtAuthGuard
    if (!user) throw new UnauthorizedException();

    // ⬇️ weź nazwę parametru zgodną ze ścieżką w kontrolerze
    const params = req.params ?? {};
    const ridRaw =
      params.restaurantId ?? params.id ?? params.rid ?? params.restaurant_id;
    const restaurantId = parseInt(String(ridRaw), 10);

    if (!Number.isFinite(restaurantId)) {
      throw new ForbiddenException('Invalid restaurant id');
    }

    // ADMIN ma pełny dostęp
    if (Array.isArray(user.roles) && user.roles.includes('ADMIN')) return true;

    // Sprawdź właściciela
    const r = await this.prisma.restaurant.findUnique({
      where: { id: restaurantId },
      select: { ownerId: true },
    });
    if (!r) throw new NotFoundException('Restaurant not found');
    if (r.ownerId !== user.id) throw new ForbiddenException('No access');

    return true;
  }
}
