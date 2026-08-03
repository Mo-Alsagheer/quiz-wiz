import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from 'src/schemas/user.schema';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'secret',
    });
  }

  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const userId = payload.userId || (payload as any).sub;
    const user = await this.userModel.findById(userId);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    if (user.passwordChangedAt && payload.iat) {
      const changedTimestamp = Math.floor(
        user.passwordChangedAt.getTime() / 1000,
      );
      if (changedTimestamp > payload.iat) {
        throw new UnauthorizedException(
          'User recently changed password! Please log in again.',
        );
      }
    }

    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      iat: payload.iat,
      exp: payload.exp,
    };
  }
}
