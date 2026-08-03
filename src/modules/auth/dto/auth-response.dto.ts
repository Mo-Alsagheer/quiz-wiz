import { UserRole } from 'src/common/enums/user-role.enum';

export interface UserResponseDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

export interface AuthResponseDto {
  message: string;
  accessToken: string;
  expiresIn?: string;
  user: UserResponseDto;
}

export interface MessageResponseDto {
  message: string;
}
