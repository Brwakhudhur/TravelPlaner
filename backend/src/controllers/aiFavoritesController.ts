import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/authMiddleware';
import { aiFavoritesModel } from '../config/dataStore';

const toKeyPart = (value: string | undefined | null): string => (value || '').toLowerCase().trim();

const buildFavoriteKey = (recommendation: any, criteria: any): string => {
  const interests = Array.isArray(criteria?.interests) ? criteria.interests.slice().sort().join(',') : '';
  const originIata = criteria?.selectedOrigin?.iataCode || criteria?.originIata || '';
  return [
    toKeyPart(recommendation?.country),
    toKeyPart(recommendation?.capital),
    toKeyPart(criteria?.departureDate),
    toKeyPart(criteria?.returnDate),
    toKeyPart(criteria?.budget),
    toKeyPart(interests),
    toKeyPart(originIata),
  ].join('|');
};

const safeJsonParse = (value: string, fallback: any) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const toggleAIFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { recommendation, criteria, details } = req.body || {};

    if (!recommendation?.country) {
      res.status(400).json({ error: 'Recommendation country is required' });
      return;
    }

    const favoriteKey = buildFavoriteKey(recommendation, criteria);
    if (!favoriteKey) {
      res.status(400).json({ error: 'Invalid favorite key' });
      return;
    }

    const existing = await aiFavoritesModel.findByKey(userId, favoriteKey);

    if (existing) {
      await aiFavoritesModel.removeByKey(userId, favoriteKey);
      res.json({ message: 'Removed from favorites', isFavorite: false, favoriteKey });
      return;
    }

    await aiFavoritesModel.add({
      id: uuidv4(),
      userId,
      favoriteKey,
      country: recommendation.country,
      capital: recommendation.capital || '',
      bestMonths: JSON.stringify(recommendation.bestMonths || []),
      matchScore: typeof recommendation.matchScore === 'number' ? recommendation.matchScore : 0,
      highlights: JSON.stringify(recommendation.highlights || []),
      activities: JSON.stringify(recommendation.activities || []),
      estimatedBudget: recommendation.estimatedBudget || '',
      whyMatch: recommendation.whyMatch || '',
      criteria: JSON.stringify(criteria || {}),
      details: JSON.stringify(details || {}),
    });

    res.json({ message: 'Added to favorites', isFavorite: true, favoriteKey });
  } catch (error) {
    console.error('Toggle AI favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getAIFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const favorites = await aiFavoritesModel.findByUserId(userId);

    const mapped = favorites.map((item: any) => ({
      id: item.id,
      favoriteKey: item.favoriteKey,
      country: item.country,
      capital: item.capital,
      bestMonths: safeJsonParse(item.bestMonths, []),
      matchScore: item.matchScore,
      highlights: safeJsonParse(item.highlights, []),
      activities: safeJsonParse(item.activities, []),
      estimatedBudget: item.estimatedBudget,
      whyMatch: item.whyMatch,
      criteria: safeJsonParse(item.criteria, {}),
      details: safeJsonParse(item.details, {}),
      createdAt: item.createdAt,
    }));

    res.json({ count: mapped.length, favorites: mapped });
  } catch (error) {
    console.error('Get AI favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
