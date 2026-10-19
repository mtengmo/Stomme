# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Vite, React 19, TypeScript, Tailwind v4, Dexie (IndexedDB), vite-plugin-pwa. Installed as a PWA on Android Chrome; hosted on GitHub Pages at stomme.tengmo.com. Chosen in docs/plan.md.

## Users
The owner (Magnus) now, a general public later. Runners and recreational athletes adding two short strength sessions a week to support running. Beginners at these exercises. Used on an Android phone at home, on the floor, mid-workout, one-handed, hands possibly sweaty, glanced at from arm's length between sets.

## Product Purpose
Stomme guides two 25–30 minute strength sessions a week (Pass A and Pass B), logs what was actually done, suggests next weights, tracks right-knee pain, and shows progress over time. Success: sessions get done consistently, safely, and are logged with almost no taps.

## Positioning
Local-only and offline: no account, no server, data stays on the phone. A cautious, pain-aware progression (rules in code, not medical advice) built around knee-friendly single-leg and core work, with a "Fråga fysioterapeuten" escape hatch instead of advice.

## Operating Context
Home workouts with 2×5 kg and 2×10 kg dumbbells, a 16 kg kettlebell, a chair or bench and a wall. Two sessions per week, at least 48 h apart. 60 s default rest between sets. Swedish language, kilograms, meters, weeks start on Monday.

## Capabilities and Constraints
MVP: week view, session mode (set counter, rest timer, big buttons), exercise cards with SVG illustrations, pain log (0–10 before/after/day after), progression suggestions, history and charts, offline PWA, JSON export/import. Muscle guidance adds a library filtered by training area, primary/supporting muscle labels, front/back region maps and a three-exercise animated-overlay prototype. Users can choose defined alternatives before starting A/B; choices preserve exercise-specific progression and pain checks. The A/B programme remains the foundation. Not in v1: accounts, server, sync, Garmin, social. All UI text Swedish. See docs/spec.md, docs/plan.md and docs/muscle-guidance-plan.md.

## Brand Commitments
Name "Stomme" (Swedish for frame / core structure) is fixed. Visual world is open.

## Evidence on Hand
No testimonials, customers or metrics; none may be fabricated. Real content is the exercise programme in docs/spec.md.

## Product Principles
1. One thing per screen, one obvious primary action within thumb reach.
2. Safety before ambition: rules are explicit and conservative; the app never gives medical advice beyond them.
3. Logging must cost almost nothing: prefill, big targets, undo instead of confirm.
4. Honest and local: no dark patterns, no accounts, user owns their data and can export it.
5. Colour never carries meaning alone.

## Accessibility & Inclusion
Touch targets at least 48 px, body text at least 16 px, high contrast, light and dark following the system, reduced motion respected.
