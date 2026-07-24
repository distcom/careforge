import {
  Controller, Get, Post, Body, Param, Query, UseGuards, Headers,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18nService } from './i18n.service';
import { RequirePermissions } from '../../common/decorators/auth.decorator';
import { CurrentUser, AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@ApiTags('i18n')
@Controller('i18n')
export class I18nController {
  constructor(private i18nService: I18nService) {}

  @Get('locales')
  @ApiOperation({ summary: 'Get supported locales' })
  getLocales() {
    return this.i18nService.getSupportedLocales();
  }

  @Get('locales/:code')
  @ApiOperation({ summary: 'Get locale details' })
  getLocale(@Param('code') code: string) {
    return this.i18nService.getLocale(code) || { error: 'Locale not found' };
  }

  @Get('translations/:locale')
  @ApiOperation({ summary: 'Get all translations for a locale' })
  getTranslations(@Param('locale') locale: string) {
    return this.i18nService.getTranslations(locale);
  }

  @Get('translate')
  @ApiOperation({ summary: 'Translate a key' })
  translate(
    @Query('key') key: string,
    @Query('locale') locale: string = 'en-US',
  ) {
    return {
      key,
      locale,
      translation: this.i18nService.translate(key, locale),
    };
  }

  @Post('translate')
  @ApiOperation({ summary: 'Translate multiple keys' })
  translateMany(
    @Body() dto: { keys: string[]; locale?: string },
  ) {
    return this.i18nService.translateMany(dto.keys, dto.locale || 'en-US');
  }

  @Get('format/date')
  @ApiOperation({ summary: 'Format a date for a locale' })
  formatDate(
    @Query('date') date: string,
    @Query('locale') locale: string = 'en-US',
  ) {
    return {
      date,
      locale,
      formatted: this.i18nService.formatDate(date, locale),
    };
  }

  @Get('format/time')
  @ApiOperation({ summary: 'Format a time for a locale' })
  formatTime(
    @Query('date') date: string,
    @Query('locale') locale: string = 'en-US',
  ) {
    return {
      date,
      locale,
      formatted: this.i18nService.formatTime(date, locale),
    };
  }

  @Get('format/datetime')
  @ApiOperation({ summary: 'Format a datetime for a locale' })
  formatDateTime(
    @Query('date') date: string,
    @Query('locale') locale: string = 'en-US',
  ) {
    return {
      date,
      locale,
      formatted: this.i18nService.formatDateTime(date, locale),
    };
  }

  @Get('format/number')
  @ApiOperation({ summary: 'Format a number for a locale' })
  formatNumber(
    @Query('value') value: string,
    @Query('locale') locale: string = 'en-US',
  ) {
    return {
      value,
      locale,
      formatted: this.i18nService.formatNumber(parseFloat(value), locale),
    };
  }

  @Get('format/currency')
  @ApiOperation({ summary: 'Format currency for a locale' })
  formatCurrency(
    @Query('value') value: string,
    @Query('locale') locale: string = 'en-US',
    @Query('currency') currency?: string,
  ) {
    return {
      value,
      locale,
      currency,
      formatted: this.i18nService.formatCurrency(parseFloat(value), locale, currency),
    };
  }

  @Post('translations')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add translations for a locale (admin)' })
  @RequirePermissions('admin:write')
  addTranslations(
    @Body() dto: { locale: string; translations: Record<string, any> },
    @CurrentUser() user: AuthenticatedUser,
  ) {
    this.i18nService.addTranslations(dto.locale, dto.translations);
    return { success: true, locale: dto.locale };
  }
}
