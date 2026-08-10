import { QuizDocument } from 'src/schemas/quiz.schema';
import { CreateQuizDto } from '../dto/create-quiz.dto';
import { UpdateQuizDto } from '../dto/update-quiz.dto';
import { QuizStatus } from 'src/common/enums/quiz.status.enum';

export interface PaginatedQuizzesResponse {
  data: QuizDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IQuizzesService {
  create(
    instructorId: string,
    createQuizDto: CreateQuizDto,
  ): Promise<QuizDocument>;
  findAll(
    instructorId: string,
    page?: number,
    limit?: number,
    status?: QuizStatus,
  ): Promise<PaginatedQuizzesResponse>;
  findOne(id: string, instructorId: string): Promise<QuizDocument>;
  update(
    id: string,
    instructorId: string,
    updateQuizDto: UpdateQuizDto,
  ): Promise<QuizDocument>;
  reassign(
    id: string,
    instructorId: string,
    scheduledDateTime: string,
  ): Promise<QuizDocument>;
}
