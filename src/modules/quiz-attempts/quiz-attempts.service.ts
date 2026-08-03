import { Injectable } from '@nestjs/common';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  QuizAttempt,
  QuizAttemptDocument,
  AttemptStatus,
} from 'src/schemas/quiz-attempt.schema';
import { JoinQuizDto } from 'src/dtos/join-quiz.dto';
import { InjectModel } from '@nestjs/mongoose';
import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';
import { Model, Types } from 'mongoose';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { SubmitQuizDto } from 'src/dtos/submit-quiz.dto';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class QuizAttemptsService {
  constructor(
    @InjectModel(QuizAttempt.name)
    private readonly quizAttemptModel: Model<QuizAttemptDocument>,

    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,

    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,

    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,

    private readonly i18n: I18nService,
  ) {}

  async joinQuiz(learnerId: string, joinQuizDto: JoinQuizDto) {
    const { code } = joinQuizDto;

    const quiz = await this.quizModel.findOne({ code }).populate('questions');

    if (!quiz) {
      throw new NotFoundException(
        await this.i18n.translate('common.quiz.invalidCode'),
      );
    }

    const now = new Date();

    if (now < quiz.codeValidFrom || now > quiz.codeValidUntil) {
      throw new BadRequestException(
        await this.i18n.translate('common.quiz.expired'),
      );
    }

    const quizEndTime = new Date(
      quiz.scheduledDateTime.getTime() + quiz.duration * 60 * 1000,
    );

    if (now > quizEndTime) {
      throw new BadRequestException(
        await this.i18n.translate('common.quiz.timeExceeded'),
      );
    }

    const submittedAttempt = await this.quizAttemptModel.findOne({
      quizId: quiz._id,
      learnerId,
      status: AttemptStatus.SUBMITTED,
    });

    if (submittedAttempt) {
      throw new BadRequestException(
        await this.i18n.translate('common.quiz.alreadySubmitted'),
      );
    }

    let attempt = await this.quizAttemptModel.findOne({
      quizId: quiz._id,
      learnerId,
      status: AttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      attempt = await this.quizAttemptModel.create({
        quizId: quiz._id,
        learnerId,
        attemptStartTime: now,
        attemptEndTime: quizEndTime,
        status: AttemptStatus.IN_PROGRESS,
        answers: [],
      });
    }

    const questions = (quiz.questions as any[]).map((question) => {
      const q = question.toObject();
      delete q.correctAnswer;
      return q;
    });

    return {
      attemptId: attempt._id,
      attemptEndTime: attempt.attemptEndTime,
      quiz: {
        id: quiz._id,
        title: quiz.title,
        description: quiz.description,
        duration: quiz.duration,
        numberOfQuestions: quiz.numberOfQuestions,
        scorePerQuestion: quiz.scorePerQuestion,
      },
      questions,
    };
  }

  async submitQuiz(
    learnerId: string,
    quizId: string,
    submitQuizDto: SubmitQuizDto,
  ) {
    const attempt = await this.quizAttemptModel.findOne({
      quizId,
      learnerId,
      status: AttemptStatus.IN_PROGRESS,
    });

    if (!attempt) {
      throw new NotFoundException(
        await this.i18n.translate('common.quiz.attemptNotFound'),
      );
    }

    const now = new Date();

    if (now > attempt.attemptEndTime) {
      throw new BadRequestException(
        await this.i18n.translate('common.quiz.timeExceeded'),
      );
    }

    const quiz = await this.quizModel.findById(quizId);

    if (!quiz) {
      throw new NotFoundException(
        await this.i18n.translate('common.quiz.notFound'),
      );
    }

    const questions = await this.questionModel.find({
      _id: { $in: quiz.questions },
    });

    const results = [];
    let correctAnswers = 0;

    for (const answer of submitQuizDto.answers) {
      const question = questions.find(
        (q) => q._id.toString() === answer.questionId,
      );

      if (!question) {
        continue;
      }

      const isCorrect = question.correctAnswer === answer.selectedOption;

      if (isCorrect) {
        correctAnswers++;
      }

      results.push({
        questionId: question._id,
        selectedOption: answer.selectedOption,
        correctOption: question.correctAnswer,
        isCorrect,
      });
    }

    const totalScore = correctAnswers * quiz.scorePerQuestion;

    const scorePercentage =
      (totalScore / (quiz.numberOfQuestions * quiz.scorePerQuestion)) * 100;

    const timeTaken = Math.floor(
      (now.getTime() - attempt.attemptStartTime.getTime()) / 1000,
    );

    const quizResult = await this.quizResultModel.create({
      quizId: quiz._id,
      learnerId,
      attemptId: attempt._id,
      submittedAt: now,
      totalScore,
      scorePercentage,
      timeTaken,
      answers: results,
    });

    attempt.status = AttemptStatus.SUBMITTED;

    attempt.answers = submitQuizDto.answers.map((a) => ({
      questionId: new Types.ObjectId(a.questionId),
      selectedOption: a.selectedOption,
    }));

    await attempt.save();

    return {
      resultId: quizResult._id,
      totalScore,
      scorePercentage,
      correctAnswers,
      totalQuestions: quiz.numberOfQuestions,
      timeTaken,
      answers: results,
    };
  }
}
