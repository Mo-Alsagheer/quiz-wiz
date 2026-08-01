import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';

import { GroupsService } from './groups.service';

import { CreateGroupDto } from 'src/dtos/create-group.dto';
import { UpdateGroupDto } from 'src/dtos/update-group.dto';

import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { UserRole } from 'src/common/enums/user-role.enum';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.INSTRUCTOR)
export class GroupsController {
  constructor(
    private readonly groupsService: GroupsService,
  ) {}

  // POST /groups
  @Post()
  create(
    @CurrentUser() user: any,
    @Body() createGroupDto: CreateGroupDto,
  ) {
    return this.groupsService.create(
      user.userId,
      createGroupDto,
    );
  }

  // GET /groups
  @Get()
  findAll(
    @CurrentUser() user: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ) {
    return this.groupsService.findAll(
      user.userId,
      Number(page),
      Number(limit),
      search,
    );
  }

  // GET /groups/:id
  @Get(':id')
  findOne(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.groupsService.findOne(
      id,
      user.userId,
    );
  }

  // PUT /groups/:id
  @Put(':id')
  update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateGroupDto: UpdateGroupDto,
  ) {
    return this.groupsService.update(
      id,
      user.userId,
      updateGroupDto,
    );
  }

  // DELETE /groups/:id
  @Delete(':id')
  remove(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.groupsService.remove(
      id,
      user.userId,
    );
  }
}