import { GroupDocument } from 'src/schemas/group.schema';
import { CreateGroupDto } from '../dto/create-group.dto';
import { UpdateGroupDto } from '../dto/update-group.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export interface PaginatedGroupsResponse {
  data: GroupDocument[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface IGroupsService {
  create(
    instructorId: string,
    createGroupDto: CreateGroupDto,
  ): Promise<GroupDocument>;
  findAll(
    instructorId: string,
    paginationDto: PaginationDto,
  ): Promise<PaginatedGroupsResponse>;
  findOne(id: string, instructorId: string): Promise<GroupDocument>;
  update(
    id: string,
    instructorId: string,
    updateGroupDto: UpdateGroupDto,
  ): Promise<GroupDocument>;
  remove(id: string, instructorId: string): Promise<{ message: string }>;
}
