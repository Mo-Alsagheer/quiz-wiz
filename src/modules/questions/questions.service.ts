import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { QuestionType } from 'src/common/enums/question-type.enum';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';
import { IQuestionsService } from './interfaces/questions-service.interface';

@Injectable()
export class QuestionsService implements IQuestionsService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  private normalizeAndValidateQuestion(
    dto: CreateQuestionDto | UpdateQuestionDto,
    existingType?: QuestionType,
  ) {
    const targetType = dto.type || existingType || QuestionType.MULTIPLE_CHOICE;

    if (targetType === QuestionType.MULTIPLE_CHOICE) {
      if (!dto.answers || dto.answers.length !== 4) {
        throw new BadRequestException(
          'Multiple choice questions must have exactly 4 options (A, B, C, D)',
        );
      }
      if (
        !dto.correctAnswer ||
        !['A', 'B', 'C', 'D'].includes(dto.correctAnswer)
      ) {
        throw new BadRequestException(
          'Multiple choice correct answer must be one of A, B, C, or D',
        );
      }
    } else if (targetType === QuestionType.TRUE_FALSE) {
      if (!dto.answers || dto.answers.length === 0) {
        dto.answers = [
          { option: 'A', text: 'True' },
          { option: 'B', text: 'False' },
        ];
      } else if (dto.answers.length !== 2) {
        throw new BadRequestException(
          'True/False questions must have exactly 2 options (True and False)',
        );
      }
      if (!dto.correctAnswer || !['A', 'B'].includes(dto.correctAnswer)) {
        throw new BadRequestException(
          'True/False correct answer must be A (True) or B (False)',
        );
      }
    } else if (targetType === QuestionType.ESSAY) {
      dto.answers = [];
    }

    return { ...dto, type: targetType };
  }

  async create(instructorId: string, createQuestionDto: CreateQuestionDto) {
    const normalized = this.normalizeAndValidateQuestion(createQuestionDto);
    const question = new this.questionModel({
      ...normalized,
      instructorId,
    });
    return question.save();
  }

  async findAll(instructorId: string, queryDto: QuestionQueryDto) {
    const {
      page = 1,
      limit = 10,
      type,
      difficultyLevel,
      categoryType,
      search,
    } = queryDto;

    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const clampedPage = Math.max(page, 1);

    const filter: Record<string, unknown> = {
      instructorId,
    };

    if (type) {
      filter.type = type;
    }

    if (difficultyLevel) {
      filter.difficultyLevel = difficultyLevel;
    }

    if (categoryType) {
      filter.categoryType = categoryType;
    }

    if (search) {
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.title = {
        $regex: sanitizedSearch,
        $options: 'i',
      };
    }

    const total = await this.questionModel.countDocuments(filter);

    const questions = await this.questionModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((clampedPage - 1) * clampedLimit)
      .limit(clampedLimit);

    return {
      data: questions,
      pagination: {
        total,
        page: clampedPage,
        limit: clampedLimit,
        totalPages: Math.ceil(total / clampedLimit),
      },
    };
  }

  async findOne(id: string, instructorId: string) {
    const question = await this.questionModel.findOne({
      _id: id,
      instructorId,
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    return question;
  }

  async update(
    id: string,
    instructorId: string,
    updateQuestionDto: UpdateQuestionDto,
  ) {
    const question = await this.questionModel.findOne({
      _id: id,
      instructorId,
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const merged = {
      type: question.type,
      answers: question.answers,
      correctAnswer: question.correctAnswer,
      ...updateQuestionDto,
    };

    const normalized = this.normalizeAndValidateQuestion(merged);

    Object.assign(question, normalized);

    await question.save();

    return question;
  }

  async remove(id: string, instructorId: string) {
    const question = await this.questionModel.findOne({
      _id: id,
      instructorId,
    });

    if (!question) {
      throw new NotFoundException('Question not found');
    }

    // Guard against deleting questions used in completed quizzes
    const isUsedInCompletedQuizzes = await this.quizResultModel.exists({
      'answers.questionId': id,
    });

    if (isUsedInCompletedQuizzes) {
      throw new BadRequestException(
        'Cannot delete question used in completed quizzes',
      );
    }

    await question.deleteOne();

    return {
      message: 'Question deleted successfully',
    };
  }
}
