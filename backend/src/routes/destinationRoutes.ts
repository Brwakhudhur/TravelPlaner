import express from 'express';
import {
  searchDestinations,
  getAllDestinations,
  getDestinationById,
  getDestinationImageByQuery,
  savePreferences,
  toggleFavorite,
  getFavorites,
  searchSpecificDestination,
  searchValidation,
  imageQueryValidation,
} from '../controllers/destinationController';
import { 
  toggleDestinationFavorite, 
  getDestinationFavorites 
} from '../controllers/destinationFavoritesController';
import { authenticate } from '../middleware/authMiddleware';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Destination routes
router.get('/search', searchValidation, searchDestinations);
router.get('/image', imageQueryValidation, getDestinationImageByQuery);
router.get('/', getAllDestinations);
router.get('/:id', getDestinationById);

// Preference routes
router.post('/preferences', savePreferences);

// Specific destination search route
router.post('/search-specific', searchSpecificDestination);

// Favorite routes
router.post('/favorites', toggleFavorite);
router.get('/favorites/list', getFavorites);

// Destination search favorites routes
router.post('/search-favorites', toggleDestinationFavorite);
router.get('/search-favorites/list', getDestinationFavorites);

export default router;
