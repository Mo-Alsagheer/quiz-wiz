import { Types } from 'mongoose';
import { QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { InstructorResultsQueryDto } from '../dto/instructor-results-query.dto';

export interface PaginatedResultsResponse {
  data: QuizResultDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface QuizSummaryResponse {
  quiz: {
    id: Types.ObjectId | string;
    title: string;
    totalEnrolledStudents: number;
  };
  summary: {
    totalAttempts: number;
    averageScorePercentage: number;
    highestScorePercentage: number;
    lowestScorePercentage: number;
    passCount: number;
    passRate: number;
  };
}

export interface IResultsService {
  findAll(
    learnerId: string,
    page?: number,
    limit?: number,
  ): Promise<PaginatedResultsResponse>;
  findOne(learnerId: string, resultId: string): Promise<QuizResultDocument>;
  findAllForInstructor(
    instructorId: string,
    query: InstructorResultsQueryDto,
  ): Promise<PaginatedResultsResponse>;
  getQuizSummaryForInstructor(
    instructorId: string,
    quizId: string,
  ): Promise<QuizSummaryResponse>;
  findOneForInstructor(
    instructorId: string,
    resultId: string,
  ): Promise<QuizResultDocument>;
}
