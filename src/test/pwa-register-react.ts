// Vitest alias target for the virtual module: inert "no update" state.
// Tests that need a waiting update replace it with vi.mock.
export function useRegisterSW() {
  return {
    needRefresh: [false, () => {}] as const,
    offlineReady: [false, () => {}] as const,
    updateServiceWorker: async () => {},
  };
}
