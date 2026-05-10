import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import UsageLog from '../models/UsageLog';

export const getHistory = async (req: AuthRequest, res: Response) => {
  const user = req.user;
  if (!user) {
    res.status(401).json({ success: false, message: 'Unauthorized' });
    return;
  }

  try {
    const logs = await UsageLog.findAll({
      where: {
        userId: user.id,
        status: 'success'
      },
      order: [['createdAt', 'DESC']],
      limit: 100 // Reasonable limit
    });

    // Map database logs to the HistoryRecord format expected by frontend
    const history = logs.map(log => {
      let outputImages: string[] = [];
      try {
        if (log.outputData) {
          const parsed = JSON.parse(log.outputData);
          // Handle Google Gen AI result format
          // result.candidates[0].content.parts[0].inlineData.data
          const base64 = parsed.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          const mimeType = parsed.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/png';
          if (base64) {
            outputImages = [`data:${mimeType};base64,${base64}`];
          }
        }
      } catch (e) {
        console.error('Failed to parse outputData for log:', log.id, e);
      }

      // Reconstruct config and page info
      return {
        id: log.id,
        page: log.page || 'image-generation',
        inputImage: log.inputData?.startsWith('image:') ? `data:image/png;base64,${log.inputData.substring(6)}` : '',
        outputImages,
        prompt: log.inputData?.startsWith('image:') ? '' : (log.inputData || ''),
        timestamp: log.createdAt.getTime(),
        config: log.config
      };
    });

    res.json({
      success: true,
      data: history
    });
  } catch (error: any) {
    console.error('Get history error:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi khi lấy lịch sử',
      error: error.message
    });
  }
};
