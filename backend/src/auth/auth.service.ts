import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { RoleName } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { authenticator } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('El correo ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const affiliateRole = await this.prisma.role.upsert({
      where: { name: RoleName.AFFILIATE },
      update: {},
      create: { name: RoleName.AFFILIATE, description: 'Afiliado' },
    });

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        epsCode: dto.epsCode || null,
        roles: { create: { roleId: affiliateRole.id } },
        profile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            documentNumber: dto.documentNumber,
          },
        },
        pet: { create: { name: 'Compi', species: 'companion' } },
      },
    });

    return this.issueTokens(user.id, user.email, [RoleName.AFFILIATE]);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: { include: { role: true } } },
    });
    if (!user || user.status === 'DELETED') {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Credenciales inválidas');

    if (user.mfaEnabled) {
      if (!dto.mfaCode || !user.mfaSecret) {
        throw new UnauthorizedException('MFA requerido');
      }
      const ok = authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret });
      if (!ok) throw new UnauthorizedException('Código MFA inválido');
    }

    const roles = user.roles.map((r) => r.role.name);
    return this.issueTokens(user.id, user.email, roles);
  }

  async refresh(refreshToken: string) {
    const tokenHash = this.hash(refreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: {
        user: { include: { roles: { include: { role: true } } } },
      },
    });
    if (!stored) throw new UnauthorizedException('Refresh token inválido');

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const roles = stored.user.roles.map((r) => r.role.name);
    return this.issueTokens(stored.user.id, stored.user.email, roles);
  }

  async logout(userId: string) {
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async enableMfa(userId: string) {
    const secret = authenticator.generateSecret();
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: secret, mfaEnabled: true },
    });
    const otpauth = authenticator.keyuri('BienestAPP', 'BienestAPP', secret);
    return { secret, otpauth };
  }

  private async issueTokens(userId: string, email: string, roles: string[]) {
    const payload = { sub: userId, email, roles };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET ?? 'change_me_access_secret',
      expiresIn: Number(process.env.JWT_ACCESS_TTL ?? 900),
    });
    const refreshToken = crypto.randomBytes(48).toString('hex');
    const ttl = Number(process.env.JWT_REFRESH_TTL ?? 2592000);
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: this.hash(refreshToken),
        expiresAt: new Date(Date.now() + ttl * 1000),
      },
    });
    return { accessToken, refreshToken, roles };
  }

  private hash(value: string) {
    return crypto.createHash('sha256').update(value).digest('hex');
  }
}
