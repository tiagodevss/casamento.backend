import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(email: string, password: string) {
    const admin = await this.prisma.admin.findUnique({ where: { email } });
    if (!admin) throw new UnauthorizedException('Credenciais inválidas');

    const passwordMatches = await bcrypt.compare(password, admin.passwordHash);
    if (!passwordMatches) throw new UnauthorizedException('Credenciais inválidas');

    const token = await this.jwt.signAsync({
      sub: admin.id,
      name: admin.name,
      email: admin.email,
    });

    return { accessToken: token, name: admin.name };
  }
}
