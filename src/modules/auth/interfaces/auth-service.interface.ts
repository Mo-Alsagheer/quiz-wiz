import { RegisterDto } from '../dto/register.dto';
import { LogInDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { AuthResponseDto, MessageResponseDto } from '../dto/auth-response.dto';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponseDto>;
  login(loginDto: LogInDto): Promise<AuthResponseDto>;
  forgotPassword(
    forgotPasswordDto: ForgotPasswordDto,
  ): Promise<MessageResponseDto>;
  resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<MessageResponseDto>;
  changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto>;
}
