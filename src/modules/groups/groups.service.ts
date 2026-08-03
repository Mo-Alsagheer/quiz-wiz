import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from 'src/schemas/group.schema';
import { User, UserDocument } from 'src/schemas/user.schema';
import { UserRole } from 'src/common/enums/user-role.enum';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name)
    private readonly groupModel: Model<GroupDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(instructorId: string, createGroupDto: CreateGroupDto) {
    const { groupName, learners = [] } = createGroupDto;

    // Deduplicate learner IDs
    const uniqueLearnerIds = Array.from(new Set(learners));

    // Check duplicate group name for the same instructor
    const existingGroup = await this.groupModel.findOne({
      instructorId,
      groupName,
    });

    if (existingGroup) {
      throw new BadRequestException('Group name already exists');
    }

    // Validate learners exist and are LEARNER role
    const learnerDocuments = await this.userModel.find({
      _id: { $in: uniqueLearnerIds },
      role: UserRole.LEARNER,
    });

    if (learnerDocuments.length !== uniqueLearnerIds.length) {
      throw new BadRequestException('One or more learner IDs are invalid');
    }

    try {
      const group = await this.groupModel.create({
        groupName,
        instructorId,
        learners: uniqueLearnerIds,
        learnerCount: uniqueLearnerIds.length,
      });

      return await this.groupModel
        .findById(group._id)
        .populate('learners', 'firstName lastName email')
        .populate('instructorId', 'firstName lastName email');
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Group name already exists');
      }
      throw error;
    }
  }

  async findAll(instructorId: string, paginationDto: PaginationDto) {
    const { page = 1, limit = 10, search } = paginationDto;

    // Clamp limit to upper bound of 100
    const clampedLimit = Math.min(Math.max(limit, 1), 100);
    const clampedPage = Math.max(page, 1);

    const filter: Record<string, any> = {
      instructorId,
    };

    if (search) {
      // Escape special characters in search regex to prevent ReDoS
      const sanitizedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.groupName = {
        $regex: sanitizedSearch,
        $options: 'i',
      };
    }

    const total = await this.groupModel.countDocuments(filter);

    const groups = await this.groupModel
      .find(filter)
      .populate('learners', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((clampedPage - 1) * clampedLimit)
      .limit(clampedLimit);

    return {
      data: groups,
      pagination: {
        total,
        page: clampedPage,
        limit: clampedLimit,
        totalPages: Math.ceil(total / clampedLimit),
      },
    };
  }

  async findOne(id: string, instructorId: string) {
    const group = await this.groupModel
      .findOne({
        _id: id,
        instructorId,
      })
      .populate('learners', 'firstName lastName email');

    if (!group) {
      throw new NotFoundException('Group not found');
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
        throw new BadRequestException('Group name already exists');
      }

      group.groupName = updateGroupDto.groupName;
    }

    // Validate and deduplicate learners if provided
    if (updateGroupDto.learners) {
      const uniqueLearnerIds = Array.from(new Set(updateGroupDto.learners));

      const learners = await this.userModel.find({
        _id: { $in: uniqueLearnerIds },
        role: UserRole.LEARNER,
      });

      if (learners.length !== uniqueLearnerIds.length) {
        throw new BadRequestException('One or more learner IDs are invalid');
      }

      group.learners = uniqueLearnerIds.map(
        (lId) => new Types.ObjectId(lId),
      );

      group.learnerCount = uniqueLearnerIds.length;
    }

    try {
      await group.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new BadRequestException('Group name already exists');
      }
      throw error;
    }

    return this.groupModel
      .findById(group._id)
      .populate('learners', 'firstName lastName email')
      .populate('instructorId', 'firstName lastName email');
  }

  async remove(id: string, instructorId: string) {
    const group = await this.groupModel.findOne({
      _id: id,
      instructorId,
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    await group.deleteOne();

    return {
      message: 'Group deleted successfully',
    };
  }
}
