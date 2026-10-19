// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { expect, it } from 'vitest';

// Imported strings are only ever rendered as React text children (never
// dangerouslySetInnerHTML), so markup in a note stays inert text.
it('renders hostile note text as text, not elements', () => {
  const note = '<img src=x onerror="alert(1)"><script>x</script>';
  const { container } = render(<p>{note}</p>);
  expect(container.querySelector('img, script')).toBeNull();
  expect(container.textContent).toBe(note);
});
