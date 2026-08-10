import { Types } from 'mongoose';
import { QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { QuestionDocument } from 'src/schemas/question.schema';
import { JoinQuizDto } from 'src/modules/quizzes/dto/join-quiz.dto';
import { SubmitQuizDto } from '../dto/submit-quiz.dto';

export interface JoinedQuizResponse {
  attemptId: Types.ObjectId | string;
  quiz: {
    id: Types.ObjectId | string;
    title: string;
    description?: string;
    duration: number;
    numberOfQuestions: number;
    scorePerQuestion: number;
    endTime: Date;
  };
  questions: QuestionDocument[];
}

export interface IQuizAttemptsService {
  joinQuiz(
    learnerId: string,
    joinQuizDto: JoinQuizDto,
  ): Promise<JoinedQuizResponse>;
  submitQuiz(
    learnerId: string,
    attemptId: string,
    submitQuizDto: SubmitQuizDto,
  ): Promise<QuizResultDocument>;
}
