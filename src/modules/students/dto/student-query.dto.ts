import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class StudentQueryDto extends PaginationDto {
  @IsOptional()
  @IsString()
  groupId?: string;
}
