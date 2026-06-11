import { Request, Response } from 'express';
import LandingSlide from '../models/LandingSlide';
import ShowcaseTab from '../models/ShowcaseTab';
import FeatureCard from '../models/FeatureCard';
import BlogPost from '../models/BlogPost';

// ─── Public API ──────────────────────────────────────────────────────────────

/** GET /api/landing-data — returns all landing page content (public, no auth) */
export const getLandingData = async (_req: Request, res: Response) => {
  try {
    const [slides, showcaseTabs, featureCards, blogPosts] = await Promise.all([
      LandingSlide.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] }),
      ShowcaseTab.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC']] }),
      FeatureCard.findAll({ order: [['sortOrder', 'ASC']] }),
      BlogPost.findAll({ where: { isActive: true }, order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] }),
    ]);

    res.json({
      success: true,
      data: {
        slides: slides.map(s => ({
          id: s.id,
          imageUrl: s.imageUrl,
          altText: s.altText,
          sortOrder: s.sortOrder,
        })),
        showcaseTabs: showcaseTabs.map(t => ({
          id: t.id,
          tabKey: t.tabKey,
          titleVi: t.titleVi,
          titleEn: t.titleEn,
          descriptionVi: t.descriptionVi,
          descriptionEn: t.descriptionEn,
          originalImageUrl: t.originalImageUrl,
          renderImageUrls: (() => { try { return JSON.parse(t.renderImageUrls); } catch { return []; } })(),
        })),
        featureCards: featureCards.map(c => ({
          id: c.id,
          cardKey: c.cardKey,
          titleVi: c.titleVi,
          titleEn: c.titleEn,
          descriptionVi: c.descriptionVi,
          descriptionEn: c.descriptionEn,
          beforeImageUrl: c.beforeImageUrl,
          afterImageUrl: c.afterImageUrl,
          extraImageUrls: (() => { try { return JSON.parse(c.extraImageUrls); } catch { return []; } })(),
        })),
        blogPosts: blogPosts.map(p => ({
          id: p.id,
          imageUrl: p.imageUrl,
          tagVi: p.tagVi,
          tagEn: p.tagEn,
          titleVi: p.titleVi,
          titleEn: p.titleEn,
          excerptVi: p.excerptVi,
          excerptEn: p.excerptEn,
          sortOrder: p.sortOrder,
          createdAt: p.createdAt,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ─── Admin: Slides ────────────────────────────────────────────────────────────

export const adminGetSlides = async (_req: Request, res: Response) => {
  const slides = await LandingSlide.findAll({ order: [['sortOrder', 'ASC']] });
  res.json({ success: true, data: slides });
};

export const adminCreateSlide = async (req: Request, res: Response) => {
  try {
    const { imageUrl, altText, sortOrder, isActive } = req.body;
    if (!imageUrl) { res.status(400).json({ success: false, error: 'imageUrl is required' }); return; }
    const slide = await LandingSlide.create({ imageUrl, altText: altText || '', sortOrder: sortOrder ?? 0, isActive: isActive ?? true });
    res.json({ success: true, data: slide });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const adminUpdateSlide = async (req: Request, res: Response) => {
  const { id } = req.params;
  await LandingSlide.update(req.body, { where: { id } });
  res.json({ success: true, message: 'Slide updated' });
};

export const adminDeleteSlide = async (req: Request, res: Response) => {
  const { id } = req.params;
  await LandingSlide.destroy({ where: { id } });
  res.json({ success: true, message: 'Slide deleted' });
};

// ─── Admin: Showcase Tabs ─────────────────────────────────────────────────────

export const adminGetShowcaseTabs = async (_req: Request, res: Response) => {
  const tabs = await ShowcaseTab.findAll({ order: [['sortOrder', 'ASC']] });
  res.json({ success: true, data: tabs });
};

export const adminUpdateShowcaseTab = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    // Ensure renderImageUrls is stored as JSON string
    if (Array.isArray(body.renderImageUrls)) {
      body.renderImageUrls = JSON.stringify(body.renderImageUrls);
    }
    await ShowcaseTab.update(body, { where: { id } });
    res.json({ success: true, message: 'ShowcaseTab updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─── Admin: Feature Cards ─────────────────────────────────────────────────────

export const adminGetFeatureCards = async (_req: Request, res: Response) => {
  const cards = await FeatureCard.findAll({ order: [['sortOrder', 'ASC']] });
  res.json({ success: true, data: cards });
};

export const adminUpdateFeatureCard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = { ...req.body };
    if (Array.isArray(body.extraImageUrls)) {
      body.extraImageUrls = JSON.stringify(body.extraImageUrls);
    }
    await FeatureCard.update(body, { where: { id } });
    res.json({ success: true, message: 'FeatureCard updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

// ─── Admin: Blog Posts ────────────────────────────────────────────────────────

export const adminGetBlogPosts = async (_req: Request, res: Response) => {
  const posts = await BlogPost.findAll({ order: [['sortOrder', 'ASC'], ['createdAt', 'DESC']] });
  res.json({ success: true, data: posts });
};

export const adminCreateBlogPost = async (req: Request, res: Response) => {
  try {
    const post = await BlogPost.create(req.body);
    res.json({ success: true, data: post });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
};

export const adminUpdateBlogPost = async (req: Request, res: Response) => {
  const { id } = req.params;
  await BlogPost.update(req.body, { where: { id } });
  res.json({ success: true, message: 'BlogPost updated' });
};

export const adminDeleteBlogPost = async (req: Request, res: Response) => {
  const { id } = req.params;
  await BlogPost.destroy({ where: { id } });
  res.json({ success: true, message: 'BlogPost deleted' });
};
