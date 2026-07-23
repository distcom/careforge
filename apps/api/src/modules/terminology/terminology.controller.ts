import {
  Controller, Get, Post, Body, Param, Query, UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TerminologyService } from './terminology.service';
import { Roles } from '../../common/decorators/auth.decorator';
import { PaginationQuery } from '../../common/dto/pagination.dto';

@ApiTags('terminology')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('terminology')
export class TerminologyController {
  constructor(private terminologyService: TerminologyService) {}

  @Get('code-sets')
  @ApiOperation({ summary: 'List code sets' })
  getCodeSets(@Query() query: PaginationQuery) {
    return this.terminologyService.getCodeSets(query);
  }

  @Get('code-sets/:id/codes')
  @ApiOperation({ summary: 'Search codes in a code set' })
  searchCodes(@Param('id') id: string, @Query() query: PaginationQuery & { code?: string }) {
    return this.terminologyService.searchCodes(id, query);
  }

  @Get('code-sets/:id/codes/:code')
  @ApiOperation({ summary: 'Get specific code' })
  getCode(@Param('id') id: string, @Param('code') code: string) {
    return this.terminologyService.getCodeByCode(id, code);
  }

  @Get('lookup/icd10')
  @ApiOperation({ summary: 'Lookup ICD-10 codes' })
  lookupIcd10(@Query('search') search: string, @Query('limit') limit?: string) {
    return this.terminologyService.lookupIcd10(search, limit ? parseInt(limit) : 20);
  }

  @Get('lookup/cpt')
  @ApiOperation({ summary: 'Lookup CPT codes' })
  lookupCpt(@Query('search') search: string, @Query('limit') limit?: string) {
    return this.terminologyService.lookupCpt(search, limit ? parseInt(limit) : 20);
  }

  @Post('code-sets')
  @Roles('admin')
  @ApiOperation({ summary: 'Create code set (admin)' })
  createCodeSet(@Body() dto: { name: string; description?: string; version?: string }) {
    return this.terminologyService.createCodeSet(dto);
  }

  @Post('code-sets/:id/import')
  @Roles('admin')
  @ApiOperation({ summary: 'Import codes (admin)' })
  importCodes(@Param('id') id: string, @Body() dto: { codes: { code: string; name: string; description?: string; parentCode?: string }[] }) {
    return this.terminologyService.importCodes(id, dto.codes);
  }
}
