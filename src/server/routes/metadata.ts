import { Router } from "express";
import { MetadataRepository } from "../repositories/MetadataRepository";

const router = Router();

router.post("/", async (req, res) => {
  const { json } = req.body;
  if (!json) {
    return res.status(400).json({ success: false, error: { code: "MISSING_JSON", message: "json is required" } });
  }
  const meta = MetadataRepository.create({ json });
  const saved = await MetadataRepository.save(meta);
  res.json({ success: true, data: { id: saved.id, createdAt: saved.createdAt } });
});

router.get("/:id", async (req, res) => {
  const { id } = req.params;
  const meta = await MetadataRepository.findOne({ where: { id } });
  if (!meta) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Metadata not found" } });
  res.json({ success: true, data: meta.json });
});

export default router;


