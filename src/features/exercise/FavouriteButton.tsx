import { useLiveQuery } from 'dexie-react-hooks';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { getDb } from '../../db/db';
import { readFavourites, toggleFavourite } from '../../db/favourites';
import type { ExerciseId } from '../../domain/types';

const FavouritesContext = createContext<{
  ids: ExerciseId[] | undefined;
} | null>(null);

export function FavouritesProvider({ children }: { children: ReactNode }) {
  const favourites = useLiveQuery(() => readFavourites(getDb()), []);
  return (
    <FavouritesContext.Provider value={{ ids: favourites }}>
      {children}
    </FavouritesContext.Provider>
  );
}

export function FavouriteButton({ id }: { id: ExerciseId }) {
  const shared = useContext(FavouritesContext);
  const local = useLiveQuery(
    () => (shared ? undefined : readFavourites(getDb())),
    [!!shared],
  );
  const favourites = shared ? shared.ids : local;
  const selected = favourites?.includes(id) ?? false;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div>
      <button
        type="button"
        aria-pressed={selected}
        disabled={busy || !favourites}
        className="inline-flex min-h-12 items-center gap-2 rounded-sm border-2 border-edge bg-paper px-3 text-base font-bold text-ink"
        onClick={async () => {
          setBusy(true);
          setError(false);
          try {
            await toggleFavourite(getDb(), id);
          } catch {
            setError(true);
          } finally {
            setBusy(false);
          }
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill={selected ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M12 21 3 12C-3 5 6-2 12 5 18-2 27 5 21 12Z" />
        </svg>
        {selected ? 'Ta bort favorit' : 'Favorit'}
      </button>
      {error && <p role="alert">Kunde inte spara favoriten. Försök igen.</p>}
    </div>
  );
}
