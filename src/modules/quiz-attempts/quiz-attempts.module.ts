import { Module } from '@nestjs/common';
import { QuizAttemptsService } from './quiz-attempts.service';
import { QuizAttemptsController } from './quiz-attempts.controller';
import { Quiz, QuizSchema } from 'src/schemas/quiz.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Question, QuestionSchema } from 'src/schemas/question.schema';
import {
  QuizAttempt,
  QuizAttemptSchema,
} from 'src/schemas/quiz-attempt.schema';
import { QuizResult, QuizResultSchema } from 'src/schemas/quiz-result.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Quiz.name, schema: QuizSchema },
      { name: Question.name, schema: QuestionSchema },
      { name: QuizAttempt.name, schema: QuizAttemptSchema },
      { name: QuizResult.name, schema: QuizResultSchema },
    ]),
  ],
  providers: [QuizAttemptsService],
  controllers: [QuizAttemptsController],
})
export class QuizAttemptsModule {}
