import { IsArray, IsIn, IsMongoId, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AnswerDto {
  @IsMongoId()
  questionId: string;

  @IsIn(['A', 'B', 'C', 'D', null])
  selectedOption: 'A' | 'B' | 'C' | 'D' | null;
}

export class SubmitQuizDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerDto)
  answers: AnswerDto[];
}
