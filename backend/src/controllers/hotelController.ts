import { Request, Response } from 'express';
import { searchHotels, getBestHotel } from '../services/hotels';

/**
 * POST /api/hotels/search
 * Search for hotels in a destination
 */
export const search = async (req: Request, res: Response) => {
  try {
    const { location, checkInDate, checkOutDate, currency } = req.body;

    if (!location || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        error: 'Missing required fields: location, checkInDate, checkOutDate',
      });
    }

    const hotels = await searchHotels({
      location,
      checkInDate,
      checkOutDate,
      currency,
    });

    console.log('[HOTEL-CTRL] Hotels found:', hotels.length, 'First hotel:', hotels[0]);
    res.json({
      success: true,
      location,
      checkInDate,
      checkOutDate,
      hotelCount: hotels.length,
      hotels,
    });
  } catch (error: any) {
    console.error('Hotel search error:', error);
    res.status(500).json({
      error: 'Failed to search hotels',
      message: error.message,
    });
  }
};

/**
 * POST /api/hotels/best
 * Get the best hotel deal for a destination
 */
export const getBest = async (req: Request, res: Response) => {
  try {
    const { location, checkInDate, checkOutDate, currency } = req.body;

    if (!location || !checkInDate || !checkOutDate) {
      return res.status(400).json({
        error: 'Missing required fields: location, checkInDate, checkOutDate',
      });
    }

    const hotel = await getBestHotel({
      location,
      checkInDate,
      checkOutDate,
      currency,
    });

    res.json({
      success: true,
      hotel: hotel || null,
    });
  } catch (error: any) {
    console.error('Get best hotel error:', error);
    res.status(500).json({
      error: 'Failed to get best hotel',
      message: error.message,
    });
  }
};
