# Repository Guidelines

## Project Structure & Module Organization

- Root files: `index.html` (entry), `styles.css` (styles), `main.js` (behavior), `README.md` (usage).
- Optional assets live under `assets/` (e.g., images, icons). Keep paths relative to root.
- Keep HTML for structure, CSS for presentation, and JS for small, focused interactions.

## Build, Test, and Development Commands

- Open directly: double‑click `index.html`.
- Local server (Python): `py -m http.server 8000` → http://localhost:8000/ (Ctrl+C to stop).
- Local server (Node): `npx http-server -p 8080` → http://localhost:8080/ (Ctrl+C to stop).
- No build step or external dependencies.

## Coding Style & Naming Conventions

- Indentation: 2 spaces; UTF‑8; Unix line endings preferred.
- HTML: semantic tags; accessible names; minimal nesting. Example: `aria-pressed` on toggle buttons.
- CSS: use variables in `:root`; class names kebab‑case; avoid IDs for styling; prefer transitions over animations.
- JS: strict mode; small pure functions; no frameworks; query via `data-*`/IDs; handle keyboard input (Enter/Space) and focus states.
- Filenames: lowercase kebab‑case (e.g., `styles.css`, `main.js`).

## Testing Guidelines

- Manual checks: keyboard navigation (Tab/Enter/Space), focus ring visibility, responsive layout, and console is free of errors.
- Visual contrast: verify headings and buttons meet accessibility contrast.
- Optional: run Lighthouse (Performance/Accessibility) and attach a short note for significant UI changes.

## Commit & Pull Request Guidelines

- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `chore:`.
  - Example: `feat: add color toggle with aria-pressed`
- Keep PRs small and focused; include before/after screenshots for UI changes and reproduction/verification steps.
- Link related issues; describe any accessibility implications and how they were tested.

## Security & Configuration Tips

- Static only; no runtime secrets. Avoid inline scripts; keep `<script>` external with `defer`.
- If deploying, enable basic headers (CSP, X-Content-Type-Options, cache control) via host configuration.
