import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

export interface AuthenticatedAdmin {
  sub: string;
  name: string;
  email: string;
}

@Injectable()
export class JwtStrategyGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { admin?: AuthenticatedAdmin }>();
    const token = this.extractToken(request);
    if (!token) throw new UnauthorizedException('Token ausente');

    try {
      request.admin = await this.jwt.verifyAsync<AuthenticatedAdmin>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Token inválido ou expirado');
    }
  }

  private extractToken(request: Request): string | undefined {
    const header = request.headers.authorization;
    if (!header) return undefined;
    const [type, token] = header.split(' ');
    return type === 'Bearer' ? token : undefined;
  }
}
