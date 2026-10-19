// Lazy route chunks transform on first use; give async queries room under load.
if (typeof document !== 'undefined') {
  const { configure } = await import('@testing-library/react');
  configure({ asyncUtilTimeout: 5000 });
}

export {};
