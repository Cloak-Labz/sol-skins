import { AppDataSource } from "../config/database";
import { Metadata } from "../entities/Metadata";

export const MetadataRepository = AppDataSource.getRepository(Metadata);


