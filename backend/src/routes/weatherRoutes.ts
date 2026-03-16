import express from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { getForecast, forecastValidation } from '../controllers/weatherController';

const router = express.Router();

router.use(authenticate);

router.get('/forecast', forecastValidation, getForecast);

export default router;
