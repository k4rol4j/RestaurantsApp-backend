import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';

interface DecodedAuth {
  username: string;
  password: string;
}

@Injectable()
export class BasicGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  private decodeAuthHeader(header: string): DecodedAuth | undefined {
    const b64auth = header.split(' ')[1];
    if (!b64auth) return undefined;
    const decoded = Buffer.from(b64auth, 'base64').toString().split(':');
    if (decoded.length !== 2) return undefined;
    return {
      username: decoded[0],
      password: decoded[1],
    };
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string>; userId?: number }>();
    const authHeader = request.headers['authorization'];
    if (!authHeader) return false;

    const decodedAuth = this.decodeAuthHeader(authHeader);
    if (!decodedAuth) return false;

    const { username, password } = decodedAuth;
    const user = await this.authService.verifyUser(username, password);
    if (!user) return false;

    request.userId = user.id; // Safely set the userId
    return true;
  }
}
