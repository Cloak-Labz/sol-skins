import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Box } from "../entities/Box";

export class BoxRepository {
  private repository: Repository<Box>;

  constructor() {
    this.repository = AppDataSource.getRepository(Box);
  }

  async findAll(): Promise<Box[]> {
    return this.repository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Box | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByBatchId(batchId: number): Promise<Box | null> {
    return this.repository.findOne({ where: { batchId } });
  }

  async findByCandyMachine(candyMachine: string): Promise<Box[]> {
    return this.repository.find({
      where: { candyMachine },
      order: { createdAt: "DESC" },
    });
  }

  async findActive(): Promise<Box[]> {
    return this.repository.find({
      where: { status: "active" },
      order: { createdAt: "DESC" },
    });
  }

  async findAvailable(): Promise<Box[]> {
    return this.repository.find({
      where: { 
        status: "active",
        itemsAvailable: 0 // More than 0 items available
      },
      order: { createdAt: "DESC" },
    });
  }

  async create(data: Partial<Box>): Promise<Box> {
    const box = this.repository.create(data);
    return this.repository.save(box);
  }

  async update(id: string, data: Partial<Box>): Promise<Box | null> {
    const result = await this.repository.update(id, data);
    if (result.affected && result.affected > 0) {
      return this.repository.findOne({ where: { id } });
    }
    return null;
  }

  async updateByBatchId(batchId: number, data: Partial<Box>): Promise<Box | null> {
    const result = await this.repository.update({ batchId }, data);
    if (result.affected && result.affected > 0) {
      return this.repository.findOne({ where: { batchId } });
    }
    return null;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async updateSyncStatus(batchId: number, isSynced: boolean, syncError?: string): Promise<void> {
    await this.repository.update(
      { batchId },
      { 
        isSynced, 
        lastSyncedAt: new Date(),
        syncError: syncError || null
      }
    );
  }

  async getStats(): Promise<{
    total: number;
    active: number;
    paused: number;
    soldOut: number;
    ended: number;
    synced: number;
    unsynced: number;
  }> {
    const [total, active, paused, soldOut, ended, synced, unsynced] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { status: "active" } }),
      this.repository.count({ where: { status: "paused" } }),
      this.repository.count({ where: { status: "sold_out" } }),
      this.repository.count({ where: { status: "ended" } }),
      this.repository.count({ where: { isSynced: true } }),
      this.repository.count({ where: { isSynced: false } }),
    ]);

    return { total, active, paused, soldOut, ended, synced, unsynced };
  }
}
