import { createContext, useContext } from 'react';
import type { AppUpdate } from '../../lib/update';

const none: AppUpdate = {
  needRefresh: false,
  showBanner: false,
  status: 'idle',
  reloadPending: false,
  checkForUpdate: async () => {},
  updateNow: async () => {},
};

/** The single useAppUpdate instance mounted in the app shell. */
export const UpdateContext = createContext<AppUpdate>(none);

export function useUpdate(): AppUpdate {
  return useContext(UpdateContext);
}
