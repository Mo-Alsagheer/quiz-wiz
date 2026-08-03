import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';

export class JoinQuizDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 7)
  @Matches(/^[A-Z0-9]+$/)
  code: string;
}
