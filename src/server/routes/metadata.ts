import { Router } from "express";
import { MetadataRepository } from "../repositories/MetadataRepository";
import { validateSchema, schemas } from "../middlewares/validation";
import { publicEndpointsLimiter } from "../middlewares/security";

const router = Router();

router.post("/", validateSchema(schemas.createMetadata), async (req, res) => {
  const { json } = req.body;
  const meta = MetadataRepository.create({ json });
  const saved = await MetadataRepository.save(meta);
  res.json({ success: true, data: { id: saved.id, createdAt: saved.createdAt } });
});

// SECURITY: Rate limited to prevent API abuse (100 req/min per IP)
router.get("/:id", publicEndpointsLimiter, validateSchema(schemas.metadataId, 'params'), async (req, res) => {
  const { id } = req.params;
  const meta = await MetadataRepository.findOne({ where: { id } });
  if (!meta) return res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Metadata not found" } });
  res.json({ success: true, data: meta.json });
});

export default router;


