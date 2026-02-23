import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';
import { createReadStream } from 'node:fs';
import { access, copyFile, mkdir, readdir, rename, rm, unlink } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

const COMPANY_LOGO_DIR = join(process.cwd(), 'uploads', 'logoEmpresa');
const COMPANY_LOGO_TEMP_DIR = join(COMPANY_LOGO_DIR, 'temp');
const ALLOWED_LOGO_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.svg'];
const DEFAULT_LOGO_CANDIDATES = [
  process.env.COMPANY_DEFAULT_LOGO_PATH?.trim(),
  join(process.cwd(), '..', 'frontend', 'public', 'assets', 'images', 'global', 'imgSEO.jpg'),
  join(process.cwd(), 'public', 'assets', 'images', 'global', 'imgSEO.jpg'),
].filter((v): v is string => Boolean(v));

export interface CompanyLogoTempResult {
  tempFileName: string;
  tempPath: string;
  size: number;
  mimeType: string;
}

export interface CompanyLogoCommitResult {
  logoFileName: string;
  logoPath: string;
  logoUrl: string;
}

export interface CompanyLogoResolved {
  absolutePath: string;
  mimeType: string;
}

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  private async ensureLogoDirectories(): Promise<void> {
    await mkdir(COMPANY_LOGO_DIR, { recursive: true });
    await mkdir(COMPANY_LOGO_TEMP_DIR, { recursive: true });
  }

  private getLogoMimeTypeByExtension(extension: string): string {
    const ext = extension.toLowerCase();
    if (ext === '.png') return 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.svg') return 'image/svg+xml';
    return 'application/octet-stream';
  }

  private getCompanyLogoUrl(companyId: number): string {
    return `/api/companies/${companyId}/logo`;
  }

  private async findCompanyLogoAbsolutePath(companyId: number): Promise<string | null> {
    await this.ensureLogoDirectories();
    for (const extension of ALLOWED_LOGO_EXTENSIONS) {
      const candidate = join(COMPANY_LOGO_DIR, `${companyId}${extension}`);
      try {
        await access(candidate);
        return candidate;
      } catch {
        // noop
      }
    }
    return null;
  }

  private async getDefaultLogoAbsolutePath(): Promise<string> {
    for (const candidate of DEFAULT_LOGO_CANDIDATES) {
      try {
        await access(candidate);
        return candidate;
      } catch {
        // noop
      }
    }
    throw new NotFoundException(
      'No se encontro imagen por defecto. Configure COMPANY_DEFAULT_LOGO_PATH o verifique imgSEO.jpg',
    );
  }

  private async removeExistingCompanyLogos(companyId: number): Promise<void> {
    await this.ensureLogoDirectories();
    const files = await readdir(COMPANY_LOGO_DIR, { withFileTypes: true });
    for (const file of files) {
      if (!file.isFile()) continue;
      const fileName = file.name.toLowerCase();
      if (!fileName.startsWith(`${companyId}.`)) continue;
      await unlink(join(COMPANY_LOGO_DIR, file.name)).catch(() => undefined);
    }
  }

  private async mapCompanyWithLogo(company: Company): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const absoluteLogoPath = await this.findCompanyLogoAbsolutePath(company.id);
    const logoPath = absoluteLogoPath ? `uploads/logoEmpresa/${basename(absoluteLogoPath)}` : null;
    return {
      ...company,
      logoUrl: this.getCompanyLogoUrl(company.id),
      logoPath,
    };
  }

  async create(dto: CreateCompanyDto, userId: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const existing = await this.repo.findOne({
      where: [
        { cedula: dto.cedula },
        { prefijo: dto.prefijo },
      ],
    });

    if (existing) {
      throw new ConflictException(
        existing.cedula === dto.cedula
          ? 'Ya existe una empresa con esa cédula'
          : 'Ya existe una empresa con ese prefijo',
      );
    }

    const company = this.repo.create({
      ...dto,
      estado: 1,
      creadoPor: userId,
      modificadoPor: userId,
    });

    const saved = await this.repo.save(company);
    return this.mapCompanyWithLogo(saved);
  }

  async findAll(includeInactive = false): Promise<Array<Company & { logoUrl: string; logoPath: string | null }>> {
    const companies = includeInactive
      ? await this.repo.find({ order: { nombre: 'ASC' } })
      : await this.repo.find({
      where: { estado: 1 },
      order: { nombre: 'ASC' },
    });
    return Promise.all(companies.map((company) => this.mapCompanyWithLogo(company)));
  }

  async findOne(id: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return this.mapCompanyWithLogo(company);
  }

  async update(id: number, dto: UpdateCompanyDto, userId: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }

    if (dto.prefijo && dto.prefijo !== company.prefijo) {
      const existing = await this.repo.findOne({ where: { prefijo: dto.prefijo } });
      if (existing) {
        throw new ConflictException('Ya existe una empresa con ese prefijo');
      }
    }

    Object.assign(company, dto, { modificadoPor: userId });
    const saved = await this.repo.save(company);
    return this.mapCompanyWithLogo(saved);
  }

  /**
   * Inactivación lógica. NO delete físico.
   * estado_empresa = 0, fecha_inactivacion = NOW()
   */
  async inactivate(id: number, userId: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    company.estado = 0;
    company.fechaInactivacion = new Date();
    company.modificadoPor = userId;
    const saved = await this.repo.save(company);
    return this.mapCompanyWithLogo(saved);
  }

  /**
   * Reactivación. estado_empresa = 1, fecha_inactivacion = NULL
   */
  async reactivate(id: number, userId: number): Promise<Company & { logoUrl: string; logoPath: string | null }> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    company.estado = 1;
    company.fechaInactivacion = null;
    company.modificadoPor = userId;
    const saved = await this.repo.save(company);
    return this.mapCompanyWithLogo(saved);
  }

  async registerTempLogo(file: {
    filename: string;
    path: string;
    size: number;
    mimetype: string;
  }): Promise<CompanyLogoTempResult> {
    await this.ensureLogoDirectories();
    const extension = extname(file.filename).toLowerCase();
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
      await unlink(file.path).catch(() => undefined);
      throw new BadRequestException('Formato de imagen no permitido');
    }

    return {
      tempFileName: basename(file.filename),
      tempPath: `uploads/logoEmpresa/temp/${basename(file.filename)}`,
      size: file.size,
      mimeType: file.mimetype,
    };
  }

  async commitTempLogo(companyId: number, tempFileName: string): Promise<CompanyLogoCommitResult> {
    const safeTempFileName = basename(tempFileName || '').trim();
    if (!safeTempFileName) {
      throw new BadRequestException('tempFileName es requerido');
    }

    await this.ensureLogoDirectories();

    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${companyId} no encontrada`);
    }

    const tempAbsolutePath = resolve(COMPANY_LOGO_TEMP_DIR, safeTempFileName);
    if (!tempAbsolutePath.startsWith(resolve(COMPANY_LOGO_TEMP_DIR))) {
      throw new BadRequestException('tempFileName invalido');
    }

    await access(tempAbsolutePath).catch(() => {
      throw new NotFoundException('Archivo temporal no encontrado');
    });

    const extension = extname(safeTempFileName).toLowerCase();
    if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
      throw new BadRequestException('Formato de imagen no permitido');
    }

    await this.removeExistingCompanyLogos(companyId);

    const finalFileName = `${companyId}${extension}`;
    const finalAbsolutePath = join(COMPANY_LOGO_DIR, finalFileName);

    try {
      await rename(tempAbsolutePath, finalAbsolutePath);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code !== 'EXDEV') throw error;
      await copyFile(tempAbsolutePath, finalAbsolutePath);
      await rm(tempAbsolutePath, { force: true });
    }

    return {
      logoFileName: finalFileName,
      logoPath: `uploads/logoEmpresa/${finalFileName}`,
      logoUrl: this.getCompanyLogoUrl(companyId),
    };
  }

  async resolveCompanyLogo(companyId: number): Promise<CompanyLogoResolved> {
    const company = await this.repo.findOne({ where: { id: companyId } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${companyId} no encontrada`);
    }

    const logoPath = await this.findCompanyLogoAbsolutePath(companyId);
    const absolutePath = logoPath ?? await this.getDefaultLogoAbsolutePath();
    return {
      absolutePath,
      mimeType: this.getLogoMimeTypeByExtension(extname(absolutePath)),
    };
  }

  createLogoReadStream(absolutePath: string) {
    return createReadStream(absolutePath);
  }
}
