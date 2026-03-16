import { Response } from 'express';
import { query, validationResult } from 'express-validator';
import { AuthRequest } from '../middleware/authMiddleware';
import { geocodeAddress } from '../services/nominatim';
import { getForecastRange } from '../services/openmeteo';

export const forecastValidation = [
  query('city').isString().notEmpty().withMessage('City is required'),
  query('startDate').isISO8601().withMessage('Valid startDate is required'),
  query('endDate').isISO8601().withMessage('Valid endDate is required'),
];

export const getForecast = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ error: errors.array().map((e) => e.msg).join(', ') });
      return;
    }

    const city = req.query.city as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    const location = await geocodeAddress(city);
    if (!location) {
      res.status(404).json({ error: 'City not found' });
      return;
    }

    const forecast = await getForecastRange(
      location.latitude,
      location.longitude,
      startDate,
      endDate
    );

    res.json({
      city,
      location,
      forecast: forecast || [],
    });
  } catch (error) {
    console.error('Forecast error:', error);
    res.status(500).json({ error: 'Server error fetching forecast' });
  }
};

export default {
  getForecast,
  forecastValidation,
};
