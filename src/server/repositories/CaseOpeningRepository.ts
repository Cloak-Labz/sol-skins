import { Repository, IsNull, Not } from 'typeorm';
import { AppDataSource } from '../config/database';
import { CaseOpening, UserDecision } from '../entities/CaseOpening';

export class CaseOpeningRepository {
  private repository: Repository<CaseOpening>;

  constructor() {
    this.repository = AppDataSource.getRepository(CaseOpening);
  }

  async findById(id: string): Promise<CaseOpening | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['user', 'lootBoxType', 'skinTemplate', 'userSkin'],
    });
  }

  async findOne(where: any): Promise<CaseOpening | null> {
    return this.repository.findOne({
      where: where,
      relations: ['user', 'lootBoxType', 'skinTemplate', 'userSkin'],
    });
  }

  async findByUser(userId: string, options?: {
    skip?: number;
    take?: number;
  }): Promise<[CaseOpening[], number]> {
    return this.repository.findAndCount({
      where: { userId },
      relations: ['lootBoxType', 'skinTemplate', 'userSkin'],
      order: { openedAt: 'DESC' },
      skip: options?.skip,
      take: options?.take,
    });
  }

  async create(caseOpeningData: Partial<CaseOpening>): Promise<CaseOpening> {
    const caseOpening = this.repository.create(caseOpeningData);
    return this.repository.save(caseOpening);
  }

  async update(id: string, caseOpeningData: Partial<CaseOpening>): Promise<void> {
    await this.repository.update(id, caseOpeningData);
  }

  async updateWithVrfResult(id: string, data: {
    randomnessSeed: string;
    skinTemplateId: string;
    userSkinId?: string;
    completedAt?: Date;
  }): Promise<void> {
    await this.repository.update(id, {
      randomnessSeed: data.randomnessSeed,
      skinTemplateId: data.skinTemplateId,
      userSkinId: data.userSkinId,
      completedAt: data.completedAt || new Date(),
    });
  }

  async updateUserDecision(id: string, decision: UserDecision): Promise<void> {
    await this.repository.update(id, {
      userDecision: decision,
      decisionAt: new Date(),
    });
  }

  async findByVrfRequestId(vrfRequestId: string): Promise<CaseOpening | null> {
    return this.repository.findOne({
      where: { vrfRequestId },
      relations: ['user', 'lootBoxType', 'skinTemplate'],
    });
  }

  async findPendingOpenings(): Promise<CaseOpening[]> {
    return this.repository.find({
      where: { completedAt: IsNull() },
      relations: ['user', 'lootBoxType'],
    });
  }

  async getOpeningStats(days?: number): Promise<{
    totalOpened: number;
    successfulOpenings: number;
    pendingOpenings: number;
  }> {
    const queryBuilder = this.repository.createQueryBuilder('caseOpening');

    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      queryBuilder.where('caseOpening.openedAt >= :date', { date });
    }

    const totalOpened = await queryBuilder.getCount();
    
    const successfulOpenings = await queryBuilder
      .andWhere('caseOpening.completedAt IS NOT NULL')
      .getCount();

    const pendingOpenings = await this.repository.count({
      where: { completedAt: IsNull() },
    });

    return {
      totalOpened,
      successfulOpenings,
      pendingOpenings,
    };
  }

  async getRecentActivity(limit: number = 50): Promise<CaseOpening[]> {
    return this.repository.find({
      where: {
        completedAt: Not(IsNull()),
      },
      relations: ['user', 'lootBoxType', 'skinTemplate'],
      order: { completedAt: 'DESC' },
      take: limit,
    });
  }
} 