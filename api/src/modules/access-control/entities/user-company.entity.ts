import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
} from 'typeorm';

/**
 * sys_usuario_empresa — Tabla puente: Usuario ↔ Empresa.
 * Define en qué empresas puede operar un usuario.
 * Fundamento del modelo multiempresa.
 */
@Entity('sys_usuario_empresa')
@Index('UQ_usuario_empresa', ['idUsuario', 'idEmpresa'], { unique: true })
export class UserCompany {
  @PrimaryGeneratedColumn({ name: 'id_usuario_empresa' })
  id: number;

  @Column({ name: 'id_usuario', type: 'int' })
  idUsuario: number;

  @Column({ name: 'id_empresa', type: 'int' })
  idEmpresa: number;

  @Column({ name: 'estado_usuario_empresa', type: 'tinyint', width: 1, default: 1 })
  estado: number;

  @CreateDateColumn({ name: 'fecha_asignacion_usuario_empresa' })
  fechaAsignacion: Date;
}
