import { IsEnum, IsOptional } from 'class-validator';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class QuestionQueryDto extends PaginationDto {
  @IsOptional()
  @IsEnum(DifficultyLevel)
  difficultyLevel?: DifficultyLevel;

  @IsOptional()
  @IsEnum(CategoryType)
  categoryType?: CategoryType;
}
