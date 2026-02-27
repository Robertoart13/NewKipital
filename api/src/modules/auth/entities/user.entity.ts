import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserStatus } from '../constants/user-status.enum';

/**
 * sys_usuarios — Root de autenticación del sistema.
 * Representa la persona digital. No contiene empresa, rol, ni permisos.
 * Eso vive en: sys_usuario_app, sys_usuario_empresa, sys_usuario_rol.
 *
 * IMPORTANTE: sys_usuarios ≠ sys_empleados.
 * Usuario = identidad digital (login). Empleado = registro laboral (RRHH).
 * Vinculación opcional vía sys_empleados.id_usuario (FK nullable).
 *
 * Reglas enterprise:
 * - NO delete físico. Solo inactivación lógica.
 * - Password siempre como bcrypt hash (nullable para futuro SSO-only).
 * - Email es el identificador único de login, siempre en minúsculas.
 * - Estados: ACTIVO(1) / INACTIVO(2) / BLOQUEADO(3).
 */
@Entity('sys_usuarios')
export class User {
  @PrimaryGeneratedColumn({ name: 'id_usuario' })
  id: number;

  // --- Identidad ---

  @Index('IDX_usuario_email', { unique: true })
  @Column({ name: 'email_usuario', type: 'varchar', length: 150, unique: true })
  email: string;

  @Index('IDX_usuario_username', { unique: true })
  @Column({ name: 'username_usuario', type: 'varchar', length: 50, unique: true, nullable: true })
  username: string | null;

  @Column({ name: 'nombre_usuario', type: 'varchar', length: 100 })
  nombre: string;

  @Column({ name: 'apellido_usuario', type: 'varchar', length: 100 })
  apellido: string;

  @Column({ name: 'telefono_usuario', type: 'varchar', length: 30, nullable: true })
  telefono: string | null;

  @Column({ name: 'avatar_url_usuario', type: 'varchar', length: 500, nullable: true })
  avatarUrl: string | null;

  // --- Seguridad / Auth ---

  @Column({ name: 'password_hash_usuario', type: 'varchar', length: 255, nullable: true })
  passwordHash: string | null;

  @Column({ name: 'password_updated_at_usuario', type: 'datetime', nullable: true })
  passwordUpdatedAt: Date | null;

  @Column({ name: 'requires_password_reset_usuario', type: 'tinyint', width: 1, default: 0 })
  requiresPasswordReset: number;

  // --- Estado enterprise ---

  @Index('IDX_usuario_estado')
  @Column({ name: 'estado_usuario', type: 'tinyint', width: 1, default: UserStatus.ACTIVO })
  estado: number;

  @Column({ name: 'fecha_inactivacion_usuario', type: 'datetime', nullable: true })
  fechaInactivacion: Date | null;

  @Column({ name: 'motivo_inactivacion_usuario', type: 'varchar', length: 300, nullable: true })
  motivoInactivacion: string | null;

  // --- Control de acceso / hardening ---

  @Column({ name: 'failed_attempts_usuario', type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ name: 'locked_until_usuario', type: 'datetime', nullable: true })
  lockedUntil: Date | null;

  @Index('IDX_usuario_ultimo_login')
  @Column({ name: 'ultimo_login_usuario', type: 'datetime', nullable: true })
  ultimoLogin: Date | null;

  @Column({ name: 'last_login_ip_usuario', type: 'varchar', length: 45, nullable: true })
  lastLoginIp: string | null;

  @Index('IDX_usuario_microsoft_oid_tid', { unique: true })
  @Column({ name: 'microsoft_oid_usuario', type: 'varchar', length: 64, nullable: true })
  microsoftOid: string | null;

  @Column({ name: 'microsoft_tid_usuario', type: 'varchar', length: 64, nullable: true })
  microsoftTid: string | null;

  // --- Auditoría ---

  @CreateDateColumn({ name: 'fecha_creacion_usuario' })
  fechaCreacion: Date;

  @UpdateDateColumn({ name: 'fecha_modificacion_usuario' })
  fechaModificacion: Date;

  @Column({ name: 'creado_por_usuario', type: 'int', nullable: true })
  creadoPor: number | null;

  @Column({ name: 'modificado_por_usuario', type: 'int', nullable: true })
  modificadoPor: number | null;
}
