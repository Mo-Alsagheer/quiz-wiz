import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { Quiz, QuizDocument } from 'src/schemas/quiz.schema';
import { InstructorResultsQueryDto } from './dto/instructor-results-query.dto';
import { IResultsService } from './interfaces/results-service.interface';

@Injectable()
export class ResultsService implements IResultsService {
  constructor(
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,

    @InjectModel(Quiz.name)
    private readonly quizModel: Model<QuizDocument>,
  ) {}

  async findAll(learnerId: string, page = 1, limit = 10) {
    const total = await this.quizResultModel.countDocuments({
      learnerId,
    });

    const results = await this.quizResultModel
      .find({
        learnerId,
      })
      .populate('quizId', 'title scheduledDateTime')
      .sort({
        submittedAt: -1,
      })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(learnerId: string, resultId: string) {
    const result = await this.quizResultModel
      .findOne({
        _id: resultId,
        learnerId,
      })
      .populate('quizId');

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    return result;
  }

  async findAllForInstructor(
    instructorId: string,
    query: InstructorResultsQueryDto,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;

    const instructorQuizzes = await this.quizModel
      .find({
        instructorId: new Types.ObjectId(instructorId),
      })
      .select('_id');

    const quizIds = instructorQuizzes.map((q) => q._id);

    if (quizIds.length === 0) {
      return {
        data: [],
        pagination: { total: 0, page, limit, totalPages: 0 },
      };
    }

    const filter: Record<string, unknown> = {
      quizId: { $in: quizIds },
    };

    if (query.quizId) {
      if (!quizIds.some((id) => id.toString() === query.quizId)) {
        throw new BadRequestException(
          'Quiz not found or does not belong to this instructor',
        );
      }
      filter.quizId = new Types.ObjectId(query.quizId);
    }

    if (query.learnerId) {
      filter.learnerId = new Types.ObjectId(query.learnerId);
    }

    const total = await this.quizResultModel.countDocuments(filter);
    const results = await this.quizResultModel
      .find(filter)
      .populate('quizId', 'title code scheduledDateTime')
      .populate('learnerId', 'firstName lastName email')
      .sort({ submittedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    return {
      data: results,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getQuizSummaryForInstructor(instructorId: string, quizId: string) {
    const quiz = await this.quizModel.findOne({
      _id: quizId,
      instructorId: new Types.ObjectId(instructorId),
    });

    if (!quiz) {
      throw new NotFoundException(
        'Quiz not found or does not belong to this instructor',
      );
    }

    const results = await this.quizResultModel.find({
      quizId: new Types.ObjectId(quizId),
    });

    if (results.length === 0) {
      return {
        quiz: {
          id: quiz._id,
          title: quiz.title,
          totalEnrolledStudents: quiz.totalEnrolledStudents,
        },
        summary: {
          totalAttempts: 0,
          averageScorePercentage: 0,
          highestScorePercentage: 0,
          lowestScorePercentage: 0,
          passCount: 0,
          passRate: 0,
        },
      };
    }

    const totalAttempts = results.length;
    const totalPercentage = results.reduce(
      (acc, r) => acc + r.scorePercentage,
      0,
    );
    const averageScorePercentage =
      Math.round((totalPercentage / totalAttempts) * 100) / 100;
    const highestScorePercentage = Math.max(
      ...results.map((r) => r.scorePercentage),
    );
    const lowestScorePercentage = Math.min(
      ...results.map((r) => r.scorePercentage),
    );
    const passCount = results.filter((r) => r.scorePercentage >= 50).length;
    const passRate = Math.round((passCount / totalAttempts) * 10000) / 100;

    return {
      quiz: {
        id: quiz._id,
        title: quiz.title,
        totalEnrolledStudents: quiz.totalEnrolledStudents,
      },
      summary: {
        totalAttempts,
        averageScorePercentage,
        highestScorePercentage,
        lowestScorePercentage,
        passCount,
        passRate,
      },
    };
  }

  async findOneForInstructor(instructorId: string, resultId: string) {
    const result = await this.quizResultModel
      .findById(resultId)
      .populate('quizId')
      .populate('learnerId', 'firstName lastName email')
      .populate('answers.questionId');

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    const quiz = result.quizId as unknown as QuizDocument;
    if (!quiz || quiz.instructorId.toString() !== instructorId) {
      throw new NotFoundException(
        'Result not found or does not belong to instructor quiz',
      );
    }

    return result;
  }
}
