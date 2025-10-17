import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "metadata" })
export class Metadata {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ type: "jsonb" })
  json!: any;

  @CreateDateColumn()
  createdAt!: Date;
}


