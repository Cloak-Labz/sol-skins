import { Router, Request, Response } from 'express';
import axios from 'axios';
import { catchAsync } from '../middlewares/errorHandler';
import { ResponseUtil } from '../utils/response';

export const imageProxyRoutes = Router();

// GET /image-proxy?url=<encoded-url>
// Proxies external images to bypass CORS restrictions
imageProxyRoutes.get('/', catchAsync(async (req: Request, res: Response) => {
  const { url } = req.query;

  if (!url || typeof url !== 'string') {
    return ResponseUtil.error(res, 'Missing or invalid URL parameter', 400);
  }

  // Validate URL is from allowed domains (Steam CDN)
  const allowedDomains = [
    'community.fastly.steamstatic.com',
    'steamcommunity-a.akamaihd.net',
    'cdn.cloudflare.steamstatic.com',
  ];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch (error) {
    return ResponseUtil.error(res, 'Invalid URL format', 400);
  }

  const isAllowed = allowedDomains.some(domain => 
    parsedUrl.hostname === domain || parsedUrl.hostname.endsWith(`.${domain}`)
  );

  if (!isAllowed) {
    return ResponseUtil.error(res, 'URL domain not allowed', 403);
  }

  try {
    // Fetch the image
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    // Get content type from response or default to image/png
    const contentType = response.headers['content-type'] || 'image/png';

    // Set CORS headers to allow frontend access
    res.set({
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
    });

    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error('Image proxy error:', error.message);
    return ResponseUtil.error(res, 'Failed to fetch image', 500);
  }
}));

