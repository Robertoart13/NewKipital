import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { App } from './entities/app.entity';
import { CreateAppDto } from './dto/create-app.dto';

@Injectable()
export class AppsService {
  constructor(
    @InjectRepository(App)
    private readonly repo: Repository<App>,
  ) {}

  async create(dto: CreateAppDto): Promise<App> {
    const existing = await this.repo.findOne({ where: { codigo: dto.codigo } });
    if (existing) {
      throw new ConflictException('Ya existe una app con ese código');
    }
    const app = this.repo.create(dto);
    return this.repo.save(app);
  }

  async findAll(): Promise<App[]> {
    return this.repo.find({ where: { estado: 1 }, order: { nombre: 'ASC' } });
  }

  async findOne(id: number): Promise<App> {
    const app = await this.repo.findOne({ where: { id } });
    if (!app) {
      throw new NotFoundException(`App con ID ${id} no encontrada`);
    }
    return app;
  }

  async findByCodigo(codigo: string): Promise<App> {
    const app = await this.repo.findOne({ where: { codigo } });
    if (!app) {
      throw new NotFoundException(`App con código '${codigo}' no encontrada`);
    }
    return app;
  }

  async inactivate(id: number): Promise<App> {
    const app = await this.findOne(id);
    app.estado = 0;
    return this.repo.save(app);
  }

  async reactivate(id: number): Promise<App> {
    const app = await this.findOne(id);
    app.estado = 1;
    return this.repo.save(app);
  }
}
