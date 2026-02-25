import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrgClass } from './entities/class.entity';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';

@Injectable()
export class ClassesService {
  constructor(
    @InjectRepository(OrgClass)
    private readonly repo: Repository<OrgClass>,
  ) {}

  async create(dto: CreateClassDto): Promise<OrgClass> {
    await this.assertCodigoUnique(dto.codigo);
    if (dto.idExterno?.trim()) {
      await this.assertIdExternoUnique(dto.idExterno.trim());
    }

    const entity = this.repo.create({
      nombre: dto.nombre.trim(),
      descripcion: dto.descripcion?.trim() || null,
      codigo: dto.codigo.trim(),
      idExterno: dto.idExterno?.trim() || null,
      esInactivo: 0,
    });
    return this.repo.save(entity);
  }

  async findAll(includeInactive = false, inactiveOnly = false): Promise<OrgClass[]> {
    const qb = this.repo.createQueryBuilder('c').orderBy('c.nombre', 'ASC');

    if (inactiveOnly) {
      qb.where('c.esInactivo = 1');
    } else if (!includeInactive) {
      qb.where('c.esInactivo = 0');
    }

    return qb.getMany();
  }

  async findOne(id: number): Promise<OrgClass> {
    const found = await this.repo.findOne({ where: { id } });
    if (!found) {
      throw new NotFoundException(`Clase con ID ${id} no encontrada`);
    }
    return found;
  }

  async update(id: number, dto: UpdateClassDto): Promise<OrgClass> {
    const found = await this.findOne(id);

    if (dto.codigo && dto.codigo.trim() !== found.codigo) {
      await this.assertCodigoUnique(dto.codigo.trim(), id);
    }

    if (dto.idExterno !== undefined) {
      const nextIdExterno = dto.idExterno.trim();
      if (nextIdExterno) {
        await this.assertIdExternoUnique(nextIdExterno, id);
      }
      found.idExterno = nextIdExterno || null;
    }

    if (dto.nombre !== undefined) {
      found.nombre = dto.nombre.trim();
    }
    if (dto.descripcion !== undefined) {
      found.descripcion = dto.descripcion.trim() || null;
    }
    if (dto.codigo !== undefined) {
      found.codigo = dto.codigo.trim();
    }

    return this.repo.save(found);
  }

  async inactivate(id: number): Promise<OrgClass> {
    const found = await this.findOne(id);
    found.esInactivo = 1;
    return this.repo.save(found);
  }

  async reactivate(id: number): Promise<OrgClass> {
    const found = await this.findOne(id);
    found.esInactivo = 0;
    return this.repo.save(found);
  }

  private async assertCodigoUnique(codigo: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { codigo } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe una clase con ese codigo');
    }
  }

  private async assertIdExternoUnique(idExterno: string, exceptId?: number): Promise<void> {
    const existing = await this.repo.findOne({ where: { idExterno } });
    if (existing && existing.id !== exceptId) {
      throw new ConflictException('Ya existe una clase con ese ID externo');
    }
  }
}

