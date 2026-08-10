import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { GroupsService } from './groups.service';

import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';
import { JwtPayload } from 'src/common/interfaces/jwt-payload.interface';
import { ParseObjectIdPipe } from 'src/common/pipes/parse-object-id.pipe';

@ApiTags('Groups')
@ApiBearerAuth('bearer-auth')
@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  // POST /groups
  @ApiOperation({ summary: 'Create a new student group' })
  @ApiResponse({ status: 201, description: 'Group created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error or duplicate name',
  })
  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.groupsService.create(user.userId, createGroupDto);
  }

  // GET /groups
  @ApiOperation({
    summary: 'Get all groups created by instructor with pagination',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of groups' })
  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query() paginationDto: PaginationDto,
  ) {
    return this.groupsService.findAll(user.userId, paginationDto);
  }

  // GET /groups/:id
  @ApiOperation({ summary: 'Get single group details by ID' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Get(':id')
  findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.groupsService.findOne(id, user.userId);
  }

  // PUT /groups/:id
  @ApiOperation({
    summary: 'Update group name, description, or assigned learners',
  })
  @ApiResponse({ status: 200, description: 'Group updated successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Put(':id')
  update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(id, user.userId, updateGroupDto);
  }

  // DELETE /groups/:id
  @ApiOperation({ summary: 'Delete group by ID' })
  @ApiResponse({ status: 200, description: 'Group deleted successfully' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @Delete(':id')
  remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseObjectIdPipe) id: string,
  ) {
    return this.groupsService.remove(id, user.userId);
  }
}
