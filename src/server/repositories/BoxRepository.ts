import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Box } from '../entities/Box';

export class BoxRepository {
  private repository: Repository<Box>;

  constructor() {
    this.repository = AppDataSource.getRepository(Box);
  }

  async findById(id: string): Promise<Box | null> {
    return this.repository.findOne({
      where: { id },
    });
  }

  async findAll(): Promise<Box[]> {
    return this.repository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findAllActive(): Promise<Box[]> {
    return this.repository.find({
      where: { status: 'active' },
      order: { createdAt: 'DESC' },
    });
  }

  async findByBatchId(batchId: number): Promise<Box | null> {
    return this.repository.findOne({
      where: { batchId },
    });
  }

  async update(id: string, updates: Partial<Box>): Promise<Box | null> {
    await this.repository.update(id, updates);
    return this.repository.findOne({ where: { id } });
  }

  async updateByBatchId(batchId: number, updates: Partial<Box>): Promise<Box | null> {
    await this.repository.update({ batchId }, updates);
    return this.repository.findOne({ where: { batchId } });
  }

  async updateSyncStatus(batchId: number, isSynced: boolean, errorMessage?: string): Promise<void> {
    await this.repository.update(
      { batchId },
      { 
        isSynced,
        lastSyncError: errorMessage || null,
        lastSyncAt: new Date()
      }
    );
  }

  async getStats(): Promise<any> {
    const totalBoxes = await this.repository.count();
    const activeBoxes = await this.repository.count({ where: { status: 'active' } });
    const syncedBoxes = await this.repository.count({ where: { isSynced: true } });
    
    return {
      totalBoxes,
      activeBoxes,
      syncedBoxes,
      unsyncedBoxes: totalBoxes - syncedBoxes
    };
  }

  async create(boxData: Partial<Box>): Promise<Box> {
    const box = this.repository.create(boxData);
    return this.repository.save(box);
  }

  async save(box: Box): Promise<Box> {
    return this.repository.save(box);
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}