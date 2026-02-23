import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from './entities/company.entity.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly repo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto, userId: number): Promise<Company> {
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

    return this.repo.save(company);
  }

  async findAll(includeInactive = false): Promise<Company[]> {
    if (includeInactive) {
      return this.repo.find({ order: { nombre: 'ASC' } });
    }
    return this.repo.find({
      where: { estado: 1 },
      order: { nombre: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Company> {
    const company = await this.repo.findOne({ where: { id } });
    if (!company) {
      throw new NotFoundException(`Empresa con ID ${id} no encontrada`);
    }
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto, userId: number): Promise<Company> {
    const company = await this.findOne(id);

    if (dto.prefijo && dto.prefijo !== company.prefijo) {
      const existing = await this.repo.findOne({ where: { prefijo: dto.prefijo } });
      if (existing) {
        throw new ConflictException('Ya existe una empresa con ese prefijo');
      }
    }

    Object.assign(company, dto, { modificadoPor: userId });
    return this.repo.save(company);
  }

  /**
   * Inactivación lógica. NO delete físico.
   * estado_empresa = 0, fecha_inactivacion = NOW()
   */
  async inactivate(id: number, userId: number): Promise<Company> {
    const company = await this.findOne(id);
    company.estado = 0;
    company.fechaInactivacion = new Date();
    company.modificadoPor = userId;
    return this.repo.save(company);
  }

  /**
   * Reactivación. estado_empresa = 1, fecha_inactivacion = NULL
   */
  async reactivate(id: number, userId: number): Promise<Company> {
    const company = await this.findOne(id);
    company.estado = 1;
    company.fechaInactivacion = null;
    company.modificadoPor = userId;
    return this.repo.save(company);
  }
}
