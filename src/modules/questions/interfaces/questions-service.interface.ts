import { QuestionDocument } from 'src/schemas/question.schema';
import { CreateQuestionDto } from '../dto/create-question.dto';
import { UpdateQuestionDto } from '../dto/update-question.dto';
import { QuestionQueryDto } from '../dto/question-query.dto';

export interface PaginatedQuestionsResponse {
  data: QuestionDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IQuestionsService {
  create(
    instructorId: string,
    createQuestionDto: CreateQuestionDto,
  ): Promise<QuestionDocument>;
  findAll(
    instructorId: string,
    queryDto: QuestionQueryDto,
  ): Promise<PaginatedQuestionsResponse>;
  findOne(id: string, instructorId: string): Promise<QuestionDocument>;
  update(
    id: string,
    instructorId: string,
    updateQuestionDto: UpdateQuestionDto,
  ): Promise<QuestionDocument>;
  remove(id: string, instructorId: string): Promise<{ message: string }>;
}
