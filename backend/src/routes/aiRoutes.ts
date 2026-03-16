import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getAIRecommendations, aiRecommendationValidation } from '../controllers/aiController';
import { getAIFavorites, toggleAIFavorite } from '../controllers/aiFavoritesController';

const router = express.Router();

// AI recommendation routes
router.post('/recommendations', authenticate, aiRecommendationValidation, getAIRecommendations);

// AI favorites routes
router.post('/favorites', authenticate, toggleAIFavorite);
router.get('/favorites', authenticate, getAIFavorites);

export default router;
