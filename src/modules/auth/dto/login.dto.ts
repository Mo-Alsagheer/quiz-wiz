import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsEmail,
} from 'class-validator';

export class LogInDto {
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  password: string;
}
