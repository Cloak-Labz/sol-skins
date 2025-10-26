import { Repository } from "typeorm";
import { AppDataSource } from "../config/database";
import { Inventory } from "../entities/Inventory";

export class InventoryRepository {
  private repository: Repository<Inventory>;

  constructor() {
    this.repository = AppDataSource.getRepository(Inventory);
  }

  async findAll(): Promise<Inventory[]> {
    return this.repository.find({
      order: { createdAt: "DESC" },
    });
  }

  async findById(id: string): Promise<Inventory | null> {
    return this.repository.findOne({ where: { id } });
  }

  async findByMintedAsset(mintedAsset: string): Promise<Inventory | null> {
    return this.repository.findOne({ where: { mintedAsset } });
  }

  async findAvailableForBatch(): Promise<Inventory[]> {
    return this.repository.find({
      where: { assignedToBatch: false, mintedAsset: Not(IsNull()) },
      order: { createdAt: "DESC" },
    });
  }

  async findByBatchId(batchId: number): Promise<Inventory[]> {
    return this.repository.find({
      where: { batchId },
      order: { createdAt: "ASC" },
    });
  }

  async search(query: string): Promise<Inventory[]> {
    return this.repository
      .createQueryBuilder("inventory")
      .where("LOWER(inventory.name) LIKE LOWER(:query)", {
        query: `%${query}%`,
      })
      .orWhere("LOWER(inventory.description) LIKE LOWER(:query)", {
        query: `%${query}%`,
      })
      .orderBy("inventory.createdAt", "DESC")
      .getMany();
  }

  async create(data: Partial<Inventory>): Promise<Inventory> {
    const inventory = this.repository.create(data);
    return this.repository.save(inventory);
  }

  async update(
    id: string,
    data: Partial<Inventory>
  ): Promise<Inventory | null> {
    await this.repository.update(id, data);
    return this.findById(id);
  }

  async assignToBatch(ids: string[], batchId: number): Promise<void> {
    await this.repository.update(
      { id: In(ids) },
      { assignedToBatch: true, batchId }
    );
  }

  async unassignFromBatch(batchId: number): Promise<void> {
    await this.repository.update(
      { batchId },
      { assignedToBatch: false, batchId: undefined }
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  async countByRarity(): Promise<Record<string, number>> {
    const results = await this.repository
      .createQueryBuilder("inventory")
      .select("inventory.rarity", "rarity")
      .addSelect("COUNT(*)", "count")
      .groupBy("inventory.rarity")
      .getRawMany();

    return results.reduce((acc, row) => {
      acc[row.rarity] = parseInt(row.count);
      return acc;
    }, {} as Record<string, number>);
  }
}

// Import necessary operators
import { In, Not, IsNull } from "typeorm";
