import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { destinationModel, preferenceModel, favoritesModel } from '../config/dataStore';
import { body, query, validationResult } from 'express-validator';
import { v4 as uuidv4 } from 'uuid';
import { getDestinationImage } from '../services/imageProvider';
import { searchDestinationComprehensive } from '../services/destinationDetails';

// Search validation
export const searchValidation = [
  query('month').optional().isInt({ min: 1, max: 12 }).withMessage('Month must be between 1 and 12'),
  query('budget').optional().isIn(['budget', 'moderate', 'luxury']).withMessage('Invalid budget'),
  query('tags').optional().isString(),
];

// Image fetch validation
export const imageQueryValidation = [
  query('query').isString().notEmpty().withMessage('Query is required'),
];

// Search destinations based on preferences
export const searchDestinations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      res.status(400).json({ error: errorMessages });
      return;
    }

    const { month, budget, tags } = req.query;
    
    const filters: any = {};
    
    if (month) {
      filters.month = parseInt(month as string);
    }
    
    if (budget) {
      filters.budget = budget;
    }
    
    if (tags) {
      filters.tags = tags as string;
    }

    const destinations = await destinationModel.search(filters);

    res.json({
      count: destinations.length,
      destinations,
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Server error during search' });
  }
};

// Get all destinations (for browsing)
export const getAllDestinations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const destinations = await destinationModel.findAll();

    res.json({
      count: destinations.length,
      destinations,
    });
  } catch (error) {
    console.error('Get destinations error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single destination
export const getDestinationById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const destination = await destinationModel.findById(req.params.id);

    if (!destination) {
      res.status(404).json({ error: 'Destination not found' });
      return;
    }

    res.json({ destination });
  } catch (error) {
    console.error('Get destination error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get image for destination query (country/city)
export const getDestinationImageByQuery = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => err.msg).join(', ');
      res.status(400).json({ error: errorMessages });
      return;
    }

    const { query: searchQuery } = req.query;
    const image = await getDestinationImage(searchQuery as string);

    res.json({ image });
  } catch (error) {
    console.error('Get destination image error:', error);
    res.status(500).json({ error: 'Server error fetching image' });
  }
};

// Save user preferences and get recommendations
export const savePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { travelMonth, budget, interests } = req.body;
    const userId = req.userId!;

    // Update or create preferences
    let preference = await preferenceModel.findByUserId(userId);
    
    if (preference) {
      preference = await preferenceModel.update(userId, {
        travelMonth,
        budget,
        interests: Array.isArray(interests) ? interests.join(',') : interests,
      });
    } else {
      preference = await preferenceModel.create({
        id: uuidv4(),
        userId,
        travelMonth,
        budget,
        interests: Array.isArray(interests) ? interests.join(',') : interests,
      });
    }

    // Get matching destinations
    const filters: any = {};
    if (travelMonth) filters.month = travelMonth;
    if (budget) filters.budget = budget;
    if (interests && interests.length > 0) filters.tags = interests[0];

    const recommendations = await destinationModel.search(filters);

    res.json({
      message: 'Preferences saved',
      preference,
      recommendations,
    });
  } catch (error) {
    console.error('Save preferences error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Toggle favorite destination
export const toggleFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { destinationId } = req.body;
    const userId = req.userId!;

    const isFavorite = await favoritesModel.isFavorite(userId, destinationId);
    
    if (isFavorite) {
      await favoritesModel.remove(userId, destinationId);
    } else {
      await favoritesModel.add(userId, destinationId);
    }

    const favorites = await favoritesModel.findByUserId(userId);

    res.json({
      message: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      isFavorite: !isFavorite,
      favorites,
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get user favorites
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const favorites = await favoritesModel.findByUserId(userId);

    res.json({
      count: favorites.length,
      favorites,
    });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Search specific destination with comprehensive details
export const searchSpecificDestination = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { destination, departureAirport, departureDate, returnDate, budget, interests, currency } = req.body;

    console.log('🔍 [DESTINATION-SEARCH] Received request with currency:', currency || 'NOT PROVIDED');

    // Validate required fields
    if (!destination || !departureAirport || !departureDate || !returnDate) {
      res.status(400).json({
        error: 'Missing required fields: destination, departureAirport, departureDate, returnDate',
      });
      return;
    }

    // Validate date format and logic
    if (new Date(returnDate) < new Date(departureDate)) {
      res.status(400).json({ error: 'Return date must be after departure date' });
      return;
    }

    // Get comprehensive destination details with budget and interests
    const results = await searchDestinationComprehensive(
      destination,
      departureAirport,
      departureDate,
      returnDate,
      budget || 'moderate',
      interests || [],
      (currency || 'USD').toUpperCase()
    );

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Search specific destination error:', error);
    res.status(500).json({ error: 'Server error searching destination' });
  }
};
