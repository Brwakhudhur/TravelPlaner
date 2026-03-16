import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthRequest } from '../middleware/authMiddleware';
import { destinationFavoritesModel } from '../config/dataStore';

const toKeyPart = (value: string | undefined | null): string => (value || '').toLowerCase().trim();

const buildFavoriteKey = (searchParams: any): string => {
  const interests = Array.isArray(searchParams?.interests) 
    ? searchParams.interests.slice().sort().join(',') 
    : '';
  
  return [
    toKeyPart(searchParams?.country),
    toKeyPart(searchParams?.capital),
    toKeyPart(searchParams?.departureAirport),
    toKeyPart(searchParams?.departureDate),
    toKeyPart(searchParams?.returnDate),
    toKeyPart(searchParams?.budget),
    toKeyPart(interests),
  ].join('|');
};

const safeJsonParse = (value: string, fallback: any) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const toggleDestinationFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { searchParams, searchResult } = req.body || {};

    if (!searchParams?.country) {
      res.status(400).json({ error: 'Country is required' });
      return;
    }

    const favoriteKey = buildFavoriteKey(searchParams);
    if (!favoriteKey) {
      res.status(400).json({ error: 'Invalid favorite key' });
      return;
    }

    const existing = await destinationFavoritesModel.findByKey(userId, favoriteKey);

    if (existing) {
      await destinationFavoritesModel.removeByKey(userId, favoriteKey);
      res.json({ message: 'Removed from favorites', isFavorite: false, favoriteKey });
      return;
    }

    await destinationFavoritesModel.add({
      id: uuidv4(),
      userId,
      favoriteKey,
      country: searchParams.country,
      capital: searchParams.capital || '',
      departureAirport: searchParams.departureAirport || '',
      departureDate: searchParams.departureDate || '',
      returnDate: searchParams.returnDate || '',
      currency: searchParams.currency || 'USD',
      budget: searchParams.budget || 'moderate',
      interests: JSON.stringify(searchParams.interests || []),
      searchResult: JSON.stringify(searchResult || {}),
    });

    res.json({ message: 'Added to favorites', isFavorite: true, favoriteKey });
  } catch (error) {
    console.error('Toggle destination favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export const getDestinationFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const favorites = await destinationFavoritesModel.findByUserId(userId);

    const mapped = favorites.map((item: any) => ({
      id: item.id,
      favoriteKey: item.favoriteKey,
      country: item.country,
      capital: item.capital,
      departureAirport: item.departureAirport,
      departureDate: item.departureDate,
      returnDate: item.returnDate,
      currency: item.currency,
      budget: item.budget,
      interests: safeJsonParse(item.interests, []),
      searchResult: safeJsonParse(item.searchResult, {}),
      createdAt: item.createdAt,
    }));

    res.json({ count: mapped.length, favorites: mapped });
  } catch (error) {
    console.error('Get destination favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
