# AGENTS.md

Marketing site for The Lamp Shack, a one-person lamp/lighting repair business in Waterford, MI. Static Astro site deployed to Netlify at https://www.thelampshack.com. Content rarely changes; treat edits as production changes to a live small-business site.

## Commands

- `npm install` — install deps
- `npm run dev` — dev server at `localhost:4321` (note: 4321, not Astro's old 3000)
- `npm run build` — production build to `dist/`
- `npm run preview` is defined but **does not work**: the `@astrojs/netlify` adapter rejects `astro preview`. To eyeball a build, serve the static output instead (e.g. `npx serve dist`).
- `npm run styles` — compile every `src/styles/less/*.less` to its matching `.css` (`lessc --math=always`). Run after editing any `.less`.
- No test or lint scripts exist. `npm run astro -- check` does a typecheck but first prompts to install `@astrojs/check` + `typescript` (not currently in `package.json`).

## Styling: LESS is the source, CSS is generated — do NOT hand-edit CSS

This is the easiest mistake to make here:

- Astro pages/components import the **compiled** files in `src/styles/css/*.css`.
- The editable source is `src/styles/less/*.less`. Each `.less` has a matching `.css`.
- The maintainer historically compiled via the **Koala** GUI app (`src/styles/less/koala-config.json` maps `/less` -> `/css`). There is now also `npm run styles`, which runs `lessc` on every `src/styles/less/*.less` into the matching `src/styles/css/*.css`.
- If you edit a `.css` directly it will be silently overwritten next time someone recompiles. **Edit the `.less` file, then run `npm run styles`** (or `npx lessc src/styles/less/<name>.less src/styles/css/<name>.css` for one file). The `.less` uses LESS math like `16/16rem`, so it must be compiled, not copied.
- **The committed `.css` is currently out of sync with the `.less` sources** (some committed CSS still contains raw, un-compiled math like `388/16rem` and is missing rules present in the `.less`). So `npm run styles` produces a large diff that is mostly the LESS catching up, not your change. After editing a `.less`, review the diff and commit only your intended files/hunks; don't blindly commit the full mass recompile unless that cleanup is the goal.
- `core-styles` and `dark` are global (imported in `BasePage.astro`); each page imports its own page CSS (`index`, `portfolio`, `reviews`, `contact`, `about`).

## Architecture

- Pages: `src/pages/*.astro` (`index`, `portfolio`, `reviews`, `contact`). Each wraps `src/components/BasePage.astro`.
- `BasePage.astro` is the HTML shell: `<head>` meta/OG tags, favicons, Astro `ClientRouter` (view transitions), plus inline Google Analytics (`G-EB6NHTX4M3`) and MS Clarity scripts. Edit site-wide meta/analytics here.
- Components: `NavBar`, `Footer`, `ReviewQuote`, `Modal`.
- Images in `src/assets/images/` are imported and served through Astro's `<Image>` (optimized at build). `public/` holds raw assets served as-is (favicons, fonts, `robots.txt`, logo SVGs).
- `src/assets/` and `src/styles/css/about.css` exist for an `about` page that currently lives in `unused/about.astro` (not routed). Leave `unused/` alone unless asked to restore the page.

## Internal links use `.html` extensions

Nav/footer/CTA links point to `/contact.html`, `/portfolio.html`, etc. (e.g. `NavBar.astro`, `index.astro:23`). Astro routes these pages as `/contact`. Keep the existing `.html` convention when adding links so they stay consistent; if a link 404s in dev, that's the cause. Don't "fix" them individually without checking the whole site.

## Deployment

- Adapter: `@astrojs/netlify` (`astro.config.mjs`). `site` is set to `https://www.thelampshack.com`; `@astrojs/sitemap` generates the sitemap, and `clientPrerender` + `prefetchAll` are enabled.
- Deploy is Netlify Git-based (push to deploy). `.netlify/` is local-only state and gitignored — never commit it.
- `tsconfig.json` extends `astro/tsconfigs/strict`.

## Frontend design skill

The Anthropic `frontend-design` skill is installed at `.opencode/skills/frontend-design/` and registered via `opencode.json`. Load it (skill tool) before any non-trivial visual/UI work — new sections, restyling, or layout changes — to keep the site distinctive rather than templated.
