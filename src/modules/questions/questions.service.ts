import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { QuizResult, QuizResultDocument } from 'src/schemas/quiz-result.schema';
import { CreateQuestionDto } from './dto/create-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionQueryDto } from './dto/question-query.dto';

@Injectable()
export class QuestionsService {
  constructor(
    @InjectModel(Question.name)
    private readonly questionModel: Model<QuestionDocument>,
    @InjectModel(QuizResult.name)
    private readonly quizResultModel: Model<QuizResultDocument>,
  ) {}

  async create(instructorId: string, createQuestionDto: CreateQuestionDto) {
    const question = await this.questionModel.create({
      ...createQuestionDto,
      instructorId,
    });

    return question;
  }

  async findAll(instructorId: string, queryDto: QuestionQueryDto) {
    const {
      page = 1,
      limit = 10,
      difficultyLevel,
      categoryType,
      search,
    } = queryDto;

    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const clampedPage = Math.max(page, 1);

    const filter: Record<string, any> = {
      instructorId,
    };

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

    Object.assign(question, updateQuestionDto);

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
