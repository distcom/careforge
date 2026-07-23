import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FacilityService } from './facility.service';
import { Roles } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('facilities')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('facilities')
export class FacilityController {
  constructor(private facilityService: FacilityService) {}

  @Get()
  @ApiOperation({ summary: 'List facilities' })
  findAll(@Query() query: PaginationQuery) {
    return this.facilityService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get facility by ID' })
  findOne(@Param('id') id: string) {
    return this.facilityService.findById(id);
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Create facility' })
  create(@Body() dto: any) {
    return this.facilityService.create(dto);
  }

  @Put(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Update facility' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.facilityService.update(id, dto);
  }

  @Delete(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate facility' })
  remove(@Param('id') id: string) {
    return this.facilityService.remove(id);
  }
}
