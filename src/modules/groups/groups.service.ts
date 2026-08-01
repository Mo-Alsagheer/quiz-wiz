
import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import {  Model, Types } from 'mongoose';
import { Group, GroupDocument } from 'src/schemas/group.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CreateGroupDto } from 'src/dtos/create-group.dto';
import { UpdateGroupDto } from 'src/dtos/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,) {}

 async create(
  instructorId: string,
  createGroupDto: CreateGroupDto,
) {
  const { groupName, learners } = createGroupDto;

  // Check duplicate group name for the same instructor
  const existingGroup = await this.groupModel.findOne({
    instructorId,
    groupName,
  });

  if (existingGroup) {
    throw new BadRequestException(
      'Group name already exists',
    );
  }

  // Validate learners
  const learnerDocuments = await this.userModel.find({
    _id: { $in: learners },
    role: UserRole.LEARNER,
  });

  if (learnerDocuments.length !== learners.length) {
    throw new BadRequestException(
      'One or more learner IDs are invalid',
    );
  }

  const group = await this.groupModel.create({
    groupName,
    instructorId,
    learners,
    learnerCount: learners.length,
  });

  return await this.groupModel
    .findById(group._id)
    .populate(
      'learners',
      'firstName lastName email',
    )
    .populate(
      'instructorId',
      'firstName lastName email',
    );
}

async findAll(
  instructorId: string,
  page = 1,
  limit = 10,
  search?: string,
) {
  const filter: Record<string, any> = {
    instructorId,
  };

  if (search) {
    filter.groupName = {
      $regex: search,
      $options: 'i',
    };
  }

  const total = await this.groupModel.countDocuments(filter);

  const groups = await this.groupModel
    .find(filter)
    .populate(
      'learners',
      'firstName lastName email',
    )
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  return {
    data: groups,
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
  const group = await this.groupModel
    .findOne({
      _id: id,
      instructorId,
    })
    .populate(
      'learners',
      'firstName lastName email',
    );

  if (!group) {
    throw new NotFoundException(
      'Group not found',
    );
  }

  return group;
}

async update(
  id: string,
  instructorId: string,
  updateGroupDto: UpdateGroupDto,
) {
  const group = await this.groupModel.findOne({
    _id: id,
    instructorId,
  });

  if (!group) {
    throw new NotFoundException('Group not found');
  }

  // Check duplicate group name
  if (
    updateGroupDto.groupName &&
    updateGroupDto.groupName !== group.groupName
  ) {
    const exists = await this.groupModel.findOne({
      instructorId,
      groupName: updateGroupDto.groupName,
      _id: { $ne: id },
    });

    if (exists) {
      throw new BadRequestException(
        'Group name already exists',
      );
    }

    group.groupName = updateGroupDto.groupName;
  }

  // Validate learners
  if (updateGroupDto.learners) {
    const learners = await this.userModel.find({
      _id: { $in: updateGroupDto.learners },
      role: UserRole.LEARNER,
    });

    if (
      learners.length !== updateGroupDto.learners.length
    ) {
      throw new BadRequestException(
        'One or more learner IDs are invalid',
      );
    }

    group.learners = updateGroupDto.learners.map(
      (id) => new Types.ObjectId(id),
    );

    group.learnerCount =
      updateGroupDto.learners.length;
  }

  await group.save();

  return this.groupModel
    .findById(group._id)
    .populate(
      'learners',
      'firstName lastName email',
    )
    .populate(
      'instructorId',
      'firstName lastName email',
    );
}


async remove(
  id: string,
  instructorId: string,
) {
  const group = await this.groupModel.findOne({
    _id: id,
    instructorId,
  });

  if (!group) {
    throw new NotFoundException(
      'Group not found',
    );
  }

  await group.deleteOne();

  return {
    message: 'Group deleted successfully',
  };
} 
}