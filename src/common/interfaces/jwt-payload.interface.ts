import { UserRole } from '../enums/user-role.enum';

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  sub?: string;
  iat?: number;
  exp?: number;
}
