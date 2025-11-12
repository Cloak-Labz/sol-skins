import { Request, Response } from 'express';
import { BoxSkinService, CreateBoxSkinDTO, UpdateBoxSkinDTO } from '../services/BoxSkinService';
import { ResponseUtil } from '../utils/response';
import { catchAsync } from '../middlewares/errorHandler';

export class BoxSkinController {
  private boxSkinService: BoxSkinService;

  constructor() {
    this.boxSkinService = new BoxSkinService();
  }

  // POST /box-skins - Create new box skin
  createBoxSkin = catchAsync(async (req: Request, res: Response) => {
    const data: CreateBoxSkinDTO = req.body;
    const boxSkin = await this.boxSkinService.createBoxSkin(data);
    ResponseUtil.success(res, boxSkin, 201);
  });

  // POST /box-skins/batch - Create multiple box skins in a single request
  createBoxSkinsBatch = catchAsync(async (req: Request, res: Response) => {
    const { skins } = req.body;
    
    if (!Array.isArray(skins) || skins.length === 0) {
      return ResponseUtil.error(res, 'Skins must be a non-empty array', 400, 'INVALID_SKINS_ARRAY');
    }

    // Limit batch size to prevent abuse (max 1000 skins per request)
    if (skins.length > 1000) {
      return ResponseUtil.error(res, 'Batch size cannot exceed 1000 skins', 400, 'BATCH_SIZE_EXCEEDED');
    }

    const boxSkins = await this.boxSkinService.createBoxSkinsBatch(skins);
    ResponseUtil.success(res, boxSkins, 201);
  });

  // GET /box-skins/box/:boxId - Get all skins for a box
  getBoxSkinsByBoxId = catchAsync(async (req: Request, res: Response) => {
    const { boxId } = req.params;
    const boxSkins = await this.boxSkinService.getBoxSkinsByBoxId(boxId);
    ResponseUtil.success(res, boxSkins);
  });

  // GET /box-skins/:id - Get box skin by ID
  getBoxSkinById = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const boxSkin = await this.boxSkinService.getBoxSkinById(id);
    ResponseUtil.success(res, boxSkin);
  });

  // PUT /box-skins/:id - Update box skin
  updateBoxSkin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    const data: UpdateBoxSkinDTO = req.body;
    const boxSkin = await this.boxSkinService.updateBoxSkin(id, data);
    ResponseUtil.success(res, boxSkin);
  });

  // DELETE /box-skins/:id - Delete box skin
  deleteBoxSkin = catchAsync(async (req: Request, res: Response) => {
    const { id } = req.params;
    await this.boxSkinService.deleteBoxSkin(id);
    ResponseUtil.success(res, null, 204);
  });

  // DELETE /box-skins/box/:boxId - Delete all skins for a box
  deleteBoxSkinsByBoxId = catchAsync(async (req: Request, res: Response) => {
    const { boxId } = req.params;
    await this.boxSkinService.deleteBoxSkinsByBoxId(boxId);
    ResponseUtil.success(res, null, 204);
  });

  // GET /box-skins/box/:boxId/distribution - Get rarity distribution
  getRarityDistribution = catchAsync(async (req: Request, res: Response) => {
    const { boxId } = req.params;
    const distribution = await this.boxSkinService.getRarityDistribution(boxId);
    ResponseUtil.success(res, distribution);
  });

  // GET /box-skins/box/:boxId/random - Get random skin (weighted)
  getRandomSkin = catchAsync(async (req: Request, res: Response) => {
    const { boxId } = req.params;
    const randomSkin = await this.boxSkinService.getWeightedRandomSkin(boxId);
    ResponseUtil.success(res, randomSkin);
  });

  // POST /box-skins/from-template - Create box skin from skin template
  createBoxSkinFromTemplate = catchAsync(async (req: Request, res: Response) => {
    const { boxId, skinTemplateId, weight, metadataUri } = req.body;
    const boxSkin = await this.boxSkinService.createBoxSkinFromTemplate(
      boxId,
      skinTemplateId,
      weight,
      metadataUri
    );
    ResponseUtil.success(res, boxSkin, 201);
  });

  // GET /box-skins/templates - Get available skin templates
  getAvailableSkinTemplates = catchAsync(async (req: Request, res: Response) => {
    const templates = await this.boxSkinService.getAvailableSkinTemplates();
    ResponseUtil.success(res, templates);
  });

  // GET /box-skins/box/:boxId/with-templates - Get box skins with template info
  getBoxSkinsWithTemplates = catchAsync(async (req: Request, res: Response) => {
    const { boxId } = req.params;
    const boxSkins = await this.boxSkinService.getBoxSkinsWithTemplates(boxId);
    ResponseUtil.success(res, boxSkins);
  });
}
