import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { User, UserDocument } from 'src/schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LogInDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { AuthResponseDto, MessageResponseDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { firstName, lastName, email, password, phone } = registerDto;

    const isExist = await this.userModel.findOne({ email });

    if (isExist) {
      throw new BadRequestException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone,
      isActive: true,
    });

    const token = await this.jwtService.signAsync({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';

    return {
      message: 'Account created successfully',
      accessToken: token,
      expiresIn,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LogInDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email }).select('+password');

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const matched = await bcrypt.compare(password, user.password);

    if (!matched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = await this.jwtService.signAsync({
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
    });

    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN') || '24h';

    return {
      message: 'Login successful',
      accessToken: token,
      expiresIn,
      user: {
        id: user._id.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });

    if (user) {
      const otp = randomInt(100000, 999999).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);

      user.passwordResetToken = hashedOtp;
      user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

      await user.save();
    }

    // Always return standard message without disclosing OTP or user existence
    return {
      message: 'If the email exists, a reset code has been sent.',
    };
  }

  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto> {
    const { email, otp, newPassword, confirmPassword } = resetPasswordDto;

    if (newPassword !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userModel
      .findOne({ email })
      .select('+passwordResetToken +passwordResetExpires +password');

    if (
      !user ||
      !user.passwordResetToken ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException('Reset code is invalid or expired');
    }

    const matchedOtp = await bcrypt.compare(otp, user.passwordResetToken);

    if (!matchedOtp) {
      throw new BadRequestException('Reset code is invalid or expired');
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = new Date();

    await user.save();

    return {
      message: 'Password reset successfully',
    };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    const { oldPassword, newPassword, confirmNewPassword } = changePasswordDto;

    if (newPassword !== confirmNewPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.userModel.findById(userId).select('+password');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matched = await bcrypt.compare(oldPassword, user.password);

    if (!matched) {
      throw new BadRequestException('Old password is incorrect');
    }

    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
      throw new BadRequestException(
        'New password must be different from old password',
      );
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.passwordChangedAt = new Date();

    await user.save();

    return {
      message: 'Password changed successfully',
    };
  }
}
