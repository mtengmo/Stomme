import { Component, type ErrorInfo, type ReactNode } from 'react';

/**
 * Last-resort boundary: a render error shows a calm Swedish screen with a
 * reload and, where possible, a way to the settings (export). Uses plain
 * anchors and buttons on purpose: no router or database is assumed to work.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const link =
      'flex min-h-14 w-full items-center justify-center rounded-md border-[3px] border-ink bg-surface px-6 text-xl font-bold text-ink no-underline';
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-5 pt-10 pb-8">
        <h1 className="m-0 text-6xl leading-none font-extrabold">
          Något gick fel
        </h1>
        <p className="m-0 text-xl">
          Din data finns kvar på telefonen. Ladda om appen. Hjälper det inte kan
          du öppna Inställningar och exportera en säkerhetskopia.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex min-h-16 w-full items-center justify-center rounded-md bg-ink px-6 text-xl font-bold text-paper"
        >
          Ladda om
        </button>
        <a href="/#/installningar" className={link}>
          Inställningar
        </a>
      </main>
    );
  }
}
