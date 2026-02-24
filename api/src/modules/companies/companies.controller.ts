import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Res,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { CompaniesService } from './companies.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { RequirePermissions } from '../../common/decorators/require-permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { basename, extname, join } from 'node:path';
import { mkdirSync } from 'node:fs';
import type { Response } from 'express';

const COMPANY_LOGO_TEMP_DIR = join(process.cwd(), 'uploads', 'logoEmpresa', 'temp');
const MAX_LOGO_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

@Controller('companies')
export class CompaniesController {
  constructor(private readonly service: CompaniesService) {}

  @Public()
  @Get('health')
  health() {
    return { status: 'ok', module: 'companies' };
  }

  @RequirePermissions('company:create')
  @Post()
  create(@Body() dto: CreateCompanyDto, @CurrentUser() user: { userId: number }) {
    return this.service.create(dto, user.userId);
  }

  @RequirePermissions('company:view')
  @Get()
  findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive: boolean | undefined,
    @Query('inactiveOnly', new ParseBoolPipe({ optional: true })) inactiveOnly: boolean | undefined,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.findAll(includeInactive ?? false, user.userId, inactiveOnly ?? false);
  }

  @RequirePermissions('company:view')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.findOne(id, user.userId);
  }

  @RequirePermissions('company:edit')
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCompanyDto, @CurrentUser() user: { userId: number }) {
    return this.service.update(id, dto, user.userId);
  }

  @RequirePermissions('company:inactivate')
  @Patch(':id/inactivate')
  inactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.inactivate(id, user.userId);
  }

  @RequirePermissions('company:reactivate')
  @Patch(':id/reactivate')
  reactivate(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: { userId: number }) {
    return this.service.reactivate(id, user.userId);
  }

  @RequirePermissions('company:edit')
  @Post('logo/temp')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, callback) => {
          mkdirSync(COMPANY_LOGO_TEMP_DIR, { recursive: true });
          callback(null, COMPANY_LOGO_TEMP_DIR);
        },
        filename: (_req, file, callback) => {
          const extension = extname(file.originalname || '').toLowerCase();
          const safeExt = extension || '.png';
          const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
          callback(null, `${unique}${safeExt}`);
        },
      }),
      limits: { fileSize: MAX_LOGO_SIZE_BYTES },
      fileFilter: (_req, file, callback) => {
        if (!ALLOWED_IMAGE_MIME_TYPES.has(file.mimetype)) {
          return callback(new BadRequestException('Solo se permiten archivos de imagen'), false);
        }
        callback(null, true);
      },
    }),
  )
  uploadTempLogo(
    @UploadedFile() file: {
      filename: string;
      path: string;
      size: number;
      mimetype: string;
    },
  ) {
    if (!file) {
      throw new BadRequestException('Debe adjuntar una imagen');
    }
    return this.service.registerTempLogo(file);
  }

  @RequirePermissions('company:edit')
  @Post(':id/logo/commit')
  commitLogo(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { tempFileName: string },
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.commitTempLogo(id, basename(body?.tempFileName ?? ''), user.userId);
  }

  @RequirePermissions('company:view')
  @Get(':id/logo')
  async getLogo(
    @Param('id', ParseIntPipe) id: number,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser() user: { userId: number },
  ): Promise<StreamableFile> {
    const logo = await this.service.resolveCompanyLogo(id, user.userId);
    res.setHeader('Content-Type', logo.mimeType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    return new StreamableFile(this.service.createLogoReadStream(logo.absolutePath));
  }

  @RequirePermissions('config:companies:audit')
  @Get(':id/audit-trail')
  getAuditTrail(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number | undefined,
    @CurrentUser() user: { userId: number },
  ) {
    return this.service.getAuditTrail(id, user.userId, limit ?? 100);
  }
}
