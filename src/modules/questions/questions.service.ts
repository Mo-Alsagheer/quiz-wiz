import { Injectable,NotFoundException , BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Question, QuestionDocument } from 'src/schemas/question.schema';
import { CreateQuestionDto } from 'src/dtos/create-question.dto';
import { CategoryType } from 'src/common/enums/category-enum';
import { DifficultyLevel } from 'src/common/enums/difficulty-enum';
import { UpdateQuestionDto } from 'src/dtos/update-question.dto';
@Injectable()
export class QuestionsService {   
constructor(
  @InjectModel(Question.name)
  private readonly questionModel: Model<QuestionDocument>,
) {}
async create(
  instructorId: string,
  createQuestionDto: CreateQuestionDto,
) {
  const question = await this.questionModel.create({
    ...createQuestionDto,
    instructorId,
  });

  return question;
}


async findAll(
  instructorId: string,
  page = 1,
  limit = 10,
  difficultyLevel?: DifficultyLevel,
  categoryType?: CategoryType,
  search?: string,
) {
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
    filter.title = {
      $regex: search,
      $options: 'i',
    };
  }

  const total =
    await this.questionModel.countDocuments(filter);

  const questions = await this.questionModel
    .find(filter)
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    data: questions,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
} 

async findOne(
  id: string,
  instructorId: string,
) {
  const question = await this.questionModel.findOne({
    _id: id,
    instructorId,
  });

  if (!question) {
    throw new NotFoundException(
      'Question not found',
    );
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
    throw new NotFoundException(
      'Question not found',
    );
  }

  Object.assign(question, updateQuestionDto);

  await question.save();

  return question;
}


async remove(
  id: string,
  instructorId: string,
) {
  const question = await this.questionModel.findOne({
    _id: id,
    instructorId,
  });

  if (!question) {
    throw new NotFoundException(
      'Question not found',
    );
  }


  await question.deleteOne();

  return {
    message: 'Question deleted successfully',
  };
}

}