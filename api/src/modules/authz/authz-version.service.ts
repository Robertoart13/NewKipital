import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthzVersion } from './entities/authz-version.entity';

@Injectable()
export class AuthzVersionService {
  constructor(
    @InjectRepository(AuthzVersion)
    private readonly repo: Repository<AuthzVersion>,
  ) {}

  async getToken(userId: number): Promise<string> {
    const [globalVersion, userVersion] = await Promise.all([
      this.getVersion(0),
      this.getVersion(userId),
    ]);
    return `${globalVersion}-${userVersion}`;
  }

  async bumpGlobal(): Promise<void> {
    await this.bumpUsers([0]);
  }

  async bumpUsers(userIds: number[]): Promise<void> {
    const ids = [...new Set(userIds)].filter((id) => Number.isInteger(id) && id >= 0);
    if (ids.length === 0) return;

    await this.ensureRows(ids);
    await this.repo
      .createQueryBuilder()
      .update(AuthzVersion)
      .set({ version: () => 'version_authz + 1' })
      .whereInIds(ids)
      .execute();
  }

  private async getVersion(userId: number): Promise<string> {
    const existing = await this.repo.findOne({ where: { userId } });
    if (existing) return existing.version;

    await this.ensureRows([userId]);
    const created = await this.repo.findOne({ where: { userId } });
    return created?.version ?? '1';
  }

  private async ensureRows(userIds: number[]): Promise<void> {
    if (userIds.length === 0) return;
    const payload = userIds.map((userId) => ({ userId, version: '1' }));
    await this.repo.upsert(payload, ['userId']);
  }
}
