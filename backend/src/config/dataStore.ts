import {
  connectDatabase as connectSqliteDatabase,
  userModel as sqliteUserModel,
  destinationModel as sqliteDestinationModel,
  preferenceModel as sqlitePreferenceModel,
  favoritesModel as sqliteFavoritesModel,
  destinationFavoritesModel as sqliteDestinationFavoritesModel,
  aiFavoritesModel as sqliteAiFavoritesModel,
  dbRun as sqliteDbRun,
  dbGet as sqliteDbGet,
  dbAll as sqliteDbAll,
} from './database';

import {
  connectPostgresDatabase,
  userModel as postgresUserModel,
  destinationModel as postgresDestinationModel,
  preferenceModel as postgresPreferenceModel,
  favoritesModel as postgresFavoritesModel,
  destinationFavoritesModel as postgresDestinationFavoritesModel,
  aiFavoritesModel as postgresAiFavoritesModel,
  cacheModel as postgresCacheModel,
} from './postgresAdapter';

const usePostgres = Boolean(process.env.DATABASE_URL);

export const isPostgresEnabled = usePostgres;

export const connectDatabase = async (): Promise<void> => {
  if (usePostgres) {
    await connectPostgresDatabase();
    return;
  }

  connectSqliteDatabase();
};

export const userModel = usePostgres ? postgresUserModel : sqliteUserModel;
export const destinationModel = usePostgres ? postgresDestinationModel : sqliteDestinationModel;
export const preferenceModel = usePostgres ? postgresPreferenceModel : sqlitePreferenceModel;
export const favoritesModel = usePostgres ? postgresFavoritesModel : sqliteFavoritesModel;
export const destinationFavoritesModel = usePostgres ? postgresDestinationFavoritesModel : sqliteDestinationFavoritesModel;
export const aiFavoritesModel = usePostgres ? postgresAiFavoritesModel : sqliteAiFavoritesModel;

export const cacheModel = usePostgres
  ? postgresCacheModel
  : {
      getValidByKey: async (key: string) =>
        sqliteDbGet(`SELECT value FROM cache WHERE key = ? AND expiresAt > datetime('now')`, [key]),
      touch: async (key: string) =>
        sqliteDbRun(`UPDATE cache SET hits = hits + 1, lastAccessed = datetime('now') WHERE key = ?`, [key]),
      upsert: async (data: { id: string; key: string; value: string; provider: string; ttlSeconds: number; expiresAt: string }) =>
        sqliteDbRun(
          `INSERT OR REPLACE INTO cache (id, key, value, provider, ttlSeconds, expiresAt, createdAt, hits, lastAccessed)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now'), 0, datetime('now'))`,
          [data.id, data.key, data.value, data.provider, data.ttlSeconds, data.expiresAt]
        ),
      deleteByKey: async (key: string) => sqliteDbRun(`DELETE FROM cache WHERE key = ?`, [key]),
      deleteByPattern: async (pattern: string) => sqliteDbRun(`DELETE FROM cache WHERE key LIKE ?`, [pattern]),
      clearExpired: async () => {
        const result = await sqliteDbRun(`DELETE FROM cache WHERE expiresAt < datetime('now')`);
        return result?.changes || 0;
      },
      getStats: async () =>
        sqliteDbGet(`
          SELECT
            COUNT(*) as totalEntries,
            SUM(hits) as totalHits,
            AVG(hits) as avgHits,
            COUNT(CASE WHEN expiresAt > datetime('now') THEN 1 END) as validEntries
          FROM cache
        `),
    };

export const dbRun = sqliteDbRun;
export const dbGet = sqliteDbGet;
export const dbAll = sqliteDbAll;
