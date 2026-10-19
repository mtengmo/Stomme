// Vitest alias target for the virtual module; tests replace it with vi.mock.
export function useRegisterSW(): never {
  throw new Error('virtual:pwa-register/react is mocked in tests');
}
