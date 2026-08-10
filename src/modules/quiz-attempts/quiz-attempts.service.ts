import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';
import {
  QuizAttempt,
  QuizAttemptDocument,
} from 'src/schemas/quiz-attempt.schema';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { Group, GroupDocument } from 'src/schemas/group.schema';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { QuestionType } from 'src/common/enums/question-type.enum';
import { JoinQuizDto } from 'src/modules/quizzes/dto/join-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { IQuizAttemptsService } from './interfaces/quiz-attempts-service.interface';

@Injectable()
export class QuizAttemptsService implements IQuizAttemptsService {
  constructor(
    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,

    @InjectModel(QuizAttempt.name)
    private readonly quizAttemptModel: Model<QuizAttemptDocument>,

    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,

    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,

    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
  ) {}

  // JOIN QUIZ BY ACCESS CODE (LEARNER ONLY)
  async joinQuiz(learnerId: string, joinQuizDto: JoinQuizDto) {
    const { code } = joinQuizDto;

    const quiz = await this.quizModel.findOne({ code });

    if (!quiz) {
      throw new NotFoundException('Invalid quiz access code');
    }

    const now = new Date();

    if (now < quiz.codeValidFrom || now > quiz.codeValidUntil) {
      throw new BadRequestException(
        'Quiz access code is expired or not active',
      );
    }

    // Check if learner is in assigned groups
    const isEnrolled = await this.groupModel.exists({
      _id: { $in: quiz.assignedToGroups },
      learners: new Types.ObjectId(learnerId),
    });

    if (!isEnrolled) {
      throw new BadRequestException(
        'You are not enrolled in an assigned group for this quiz',
      );
    }

    // Check if learner already completed
    const alreadyCompleted = await this.quizResultModel.exists({
      quizId: quiz._id,
      learnerId: new Types.ObjectId(learnerId),
    });

    if (alreadyCompleted) {
      throw new BadRequestException('You have already submitted this quiz');
    }

    // Create or resume attempt
    let attempt = await this.quizAttemptModel.findOne({
      quizId: quiz._id,
      learnerId: new Types.ObjectId(learnerId),
    });

    if (!attempt) {
      const attemptStartTime = new Date();
      const attemptEndTime = new Date(
        attemptStartTime.getTime() + quiz.duration * 60 * 1000,
      );

      attempt = await this.quizAttemptModel.create({
        quizId: quiz._id,
        learnerId: new Types.ObjectId(learnerId),
        attemptStartTime,
        attemptEndTime,
        answers: [],
      });
    }

    // Fetch questions without correct option
    const questions = await this.questionModel
      .find({ _id: { $in: quiz.questions } })
      .select('type title description answers difficultyLevel categoryType');

    return {
      attemptId: attempt._id,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        numberOfQuestions: quiz.numberOfQuestions,
        scorePerQuestion: quiz.scorePerQuestion,
        endTime: attempt.attemptEndTime,
      },
      questions,
    };
  }

  // SUBMIT QUIZ ATTEMPT (LEARNER ONLY)
  async submitQuiz(
    learnerId: string,
    attemptId: string,
    submitQuizDto: SubmitQuizDto,
  ) {
    const attempt = await this.quizAttemptModel.findOne({
      _id: attemptId,
      learnerId: new Types.ObjectId(learnerId),
    });

    if (!attempt) {
      throw new NotFoundException('Quiz attempt not found');
    }

    const quiz = await this.quizModel.findById(attempt.quizId);

    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    // Check existing result
    const existingResult = await this.quizResultModel.exists({
      quizId: quiz._id,
      learnerId: new Types.ObjectId(learnerId),
    });

    if (existingResult) {
      throw new BadRequestException('Quiz result already recorded');
    }

    const questions = await this.questionModel.find({
      _id: { $in: quiz.questions },
    });

    const questionMap = new Map(questions.map((q) => [q._id.toString(), q]));

    let correctCount = 0;
    const gradedAnswers = submitQuizDto.answers.map((ans) => {
      const q = questionMap.get(ans.questionId);
      let isCorrect = false;

      if (q) {
        if (q.type === QuestionType.ESSAY) {
          isCorrect = Boolean(
            ans.essayAnswer && ans.essayAnswer.trim().length > 0,
          );
        } else {
          isCorrect = q.correctAnswer === ans.selectedOption;
        }
      }

      if (isCorrect) {
        correctCount++;
      }

      return {
        questionId: new Types.ObjectId(ans.questionId),
        selectedOption: ans.selectedOption || null,
        correctOption: q?.correctAnswer || null,
        essayAnswer: ans.essayAnswer || null,
        isCorrect,
      };
    });

    const totalScore = correctCount * quiz.scorePerQuestion;
    const maxScore = quiz.numberOfQuestions * quiz.scorePerQuestion;
    const scorePercentage = (totalScore / maxScore) * 100;
    const now = new Date();
    const timeTaken = Math.round(
      (now.getTime() - attempt.attemptStartTime.getTime()) / 1000,
    );

    const result = await this.quizResultModel.create({
      quizId: quiz._id,
      learnerId: new Types.ObjectId(learnerId),
      attemptId: attempt._id,
      totalScore,
      scorePercentage,
      timeTaken,
      answers: gradedAnswers,
      submittedAt: now,
    });

    // Cleanup attempt
    await attempt.deleteOne();

    return result;
  }
}
