import { exercises } from '../content/exercises';
import type { ExerciseId } from '../domain/types';
import type { StommeDB } from './db';

export async function readFavourites(db: StommeDB): Promise<ExerciseId[]> {
  const value = (await db.meta.get('favourites'))?.value;
  return Array.isArray(value)
    ? [
        ...new Set(
          value.filter(
            (id): id is ExerciseId =>
              typeof id === 'string' && Object.hasOwn(exercises, id),
          ),
        ),
      ]
    : [];
}

export async function toggleFavourite(db: StommeDB, id: ExerciseId) {
  return db.transaction('rw', db.meta, async () => {
    const ids = await readFavourites(db);
    await db.meta.put({
      key: 'favourites',
      value: ids.includes(id)
        ? ids.filter((item) => item !== id)
        : [...ids, id],
    });
  });
}
