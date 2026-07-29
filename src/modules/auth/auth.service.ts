import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';

import { User, UserDocument } from 'src/schemas/user.schema';
import { RegisterDto } from 'src/dtos/register.dto';
import { LogInDto } from 'src/dtos/login.dto';
import { ForgotPasswordDto } from 'src/dtos/forgot-password.dto';
import { ResetPasswordDto } from 'src/dtos/reset-password.dto';
import { ChangePasswordDto } from 'src/dtos/change-password.dto';


@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const {
      firstName,
      lastName,
      email,
      password,
      phone,
    } = registerDto;

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
      sub: user._id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Account created successfully',
      accessToken: token,
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

  async login(loginDto: LogInDto) {
    const { email, password } = loginDto;

    const user = await this.userModel
      .findOne({ email })
      .select('+password');

    if (!user) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const matched = await bcrypt.compare(
      password,
      user.password,
    );

    if (!matched) {
      throw new UnauthorizedException(
        'Invalid email or password',
      );
    }

    const token = await this.jwtService.signAsync({
      sub: user._id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      accessToken: token,
      expiresIn: '24h',
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
      },
    };
  }

    async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      return {
        message: 'If email exists, reset code will be sent.',
      };
    }

    const otp = randomInt(100000, 999999).toString();

    user.passwordResetToken = otp;
    user.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await user.save();

    return {
      message: 'OTP generated successfully',
      otp,
    };
  }

 async resetPassword(resetPasswordDto: ResetPasswordDto) {
  const {
    email,
    otp,
    newPassword,
    confirmPassword,
  } = resetPasswordDto;

  if (newPassword !== confirmPassword) {
    throw new BadRequestException(
      'Passwords do not match',
    );
  }
    const user = await this.userModel
      .findOne({ email })
      .select('+password');

    if (!user) {
      throw new BadRequestException('Invalid email or otp');
    }

    if (
      user.passwordResetToken !== otp ||
      !user.passwordResetExpires ||
      user.passwordResetExpires < new Date()
    ) {
      throw new BadRequestException(
        'Reset code is invalid or expired',
      );
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
) {
  const {
    oldPassword,
    newPassword,
    confirmNewPassword,
  } = changePasswordDto;

  if (newPassword !== confirmNewPassword) {
    throw new BadRequestException(
      'Passwords do not match',
    );
  }
    const user = await this.userModel
      .findById(userId)
      .select('+password');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const matched = await bcrypt.compare(
      oldPassword,
      user.password,
    );

    if (!matched) {
      throw new BadRequestException(
        'Old password is incorrect',
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.password,
    );

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
