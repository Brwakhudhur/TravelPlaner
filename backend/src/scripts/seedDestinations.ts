import { Destination } from '../models/Destination';

const sampleDestinations = [
  {
    title: 'Barcelona, Spain',
    country: 'Spain',
    budget: 'Medium',
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    tags: ['Beach', 'Nightlife', 'City', 'Culture'],
    description: 'Vibrant coastal city with stunning architecture, beaches, and nightlife.',
    imageUrl: 'https://images.unsplash.com/photo-1506806732259-39c2d0268443?w=800',
    averageTemp: {
      1: { min: 8, max: 14 },
      2: { min: 9, max: 15 },
      3: { min: 10, max: 16 },
      4: { min: 12, max: 18 },
      5: { min: 16, max: 21 },
      6: { min: 19, max: 25 },
      7: { min: 22, max: 28 },
      8: { min: 22, max: 28 },
      9: { min: 20, max: 25 },
      10: { min: 16, max: 21 },
      11: { min: 11, max: 16 },
      12: { min: 9, max: 14 },
    },
    highlights: ['Sagrada Familia', 'Park Güell', 'Las Ramblas', 'Gothic Quarter'],
    activities: ['Beach lounging', 'Tapas tour', 'Architecture walking tour', 'Clubbing'],
  },
  {
    title: 'Bali, Indonesia',
    country: 'Indonesia',
    budget: 'Low',
    bestMonths: [4, 5, 6, 7, 8, 9, 10],
    tags: ['Beach', 'Nature', 'Culture', 'Adventure'],
    description: 'Tropical paradise with beaches, rice terraces, and spiritual culture.',
    imageUrl: 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=800',
    averageTemp: {
      1: { min: 24, max: 30 },
      2: { min: 24, max: 30 },
      3: { min: 24, max: 30 },
      4: { min: 24, max: 31 },
      5: { min: 24, max: 30 },
      6: { min: 23, max: 29 },
      7: { min: 23, max: 29 },
      8: { min: 23, max: 29 },
      9: { min: 23, max: 30 },
      10: { min: 24, max: 31 },
      11: { min: 24, max: 31 },
      12: { min: 24, max: 30 },
    },
    highlights: ['Ubud Rice Terraces', 'Tanah Lot Temple', 'Seminyak Beach', 'Mount Batur'],
    activities: ['Surfing', 'Temple visits', 'Rice terrace walks', 'Yoga retreats'],
  },
  {
    title: 'Reykjavik, Iceland',
    country: 'Iceland',
    budget: 'High',
    bestMonths: [6, 7, 8],
    tags: ['Nature', 'Adventure', 'City'],
    description: 'Capital city with access to geothermal pools, waterfalls, and Northern Lights.',
    imageUrl: 'https://images.unsplash.com/photo-1520208422220-d12a3c588e6c?w=800',
    averageTemp: {
      1: { min: -3, max: 2 },
      2: { min: -2, max: 3 },
      3: { min: -2, max: 3 },
      4: { min: 0, max: 6 },
      5: { min: 4, max: 9 },
      6: { min: 7, max: 12 },
      7: { min: 9, max: 14 },
      8: { min: 8, max: 13 },
      9: { min: 5, max: 10 },
      10: { min: 2, max: 7 },
      11: { min: -1, max: 3 },
      12: { min: -3, max: 2 },
    },
    highlights: ['Blue Lagoon', 'Golden Circle', 'Hallgrímskirkja', 'Gullfoss Waterfall'],
    activities: ['Northern Lights viewing', 'Geothermal bathing', 'Glacier hiking', 'Whale watching'],
  },
  {
    title: 'Tokyo, Japan',
    country: 'Japan',
    budget: 'High',
    bestMonths: [3, 4, 5, 9, 10, 11],
    tags: ['City', 'Culture', 'Food', 'Shopping'],
    description: 'Bustling metropolis blending ultra-modern and traditional culture.',
    imageUrl: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800',
    averageTemp: {
      1: { min: 2, max: 10 },
      2: { min: 3, max: 10 },
      3: { min: 6, max: 13 },
      4: { min: 11, max: 19 },
      5: { min: 15, max: 23 },
      6: { min: 19, max: 26 },
      7: { min: 23, max: 29 },
      8: { min: 24, max: 31 },
      9: { min: 21, max: 27 },
      10: { min: 15, max: 22 },
      11: { min: 9, max: 17 },
      12: { min: 4, max: 12 },
    },
    highlights: ['Shibuya Crossing', 'Senso-ji Temple', 'Tsukiji Market', 'Tokyo Tower'],
    activities: ['Sushi tasting', 'Temple visits', 'Shopping in Harajuku', 'Cherry blossom viewing'],
  },
  {
    title: 'Lisbon, Portugal',
    country: 'Portugal',
    budget: 'Medium',
    bestMonths: [4, 5, 6, 9, 10],
    tags: ['City', 'Beach', 'Culture', 'Food'],
    description: 'Charming coastal capital with colorful tiles, hills, and seafood.',
    imageUrl: 'https://images.unsplash.com/photo-1555881400-74d7acaacd8b?w=800',
    averageTemp: {
      1: { min: 8, max: 15 },
      2: { min: 9, max: 16 },
      3: { min: 10, max: 18 },
      4: { min: 12, max: 20 },
      5: { min: 14, max: 22 },
      6: { min: 17, max: 25 },
      7: { min: 19, max: 28 },
      8: { min: 19, max: 28 },
      9: { min: 18, max: 26 },
      10: { min: 15, max: 22 },
      11: { min: 11, max: 18 },
      12: { min: 9, max: 15 },
    },
    highlights: ['Belém Tower', 'Alfama District', 'Jerónimos Monastery', 'Tram 28'],
    activities: ['Tram rides', 'Pastéis de nata tasting', 'Fado music nights', 'Beach day trips'],
  },
];

export const seedDestinations = async (): Promise<void> => {
  try {
    // Clear existing data
    await Destination.deleteMany({});
    
    // Insert sample data
    await Destination.insertMany(sampleDestinations);
    
    console.log('✅ Sample destinations seeded successfully');
  } catch (error) {
    console.error('❌ Error seeding destinations:', error);
  }
};
