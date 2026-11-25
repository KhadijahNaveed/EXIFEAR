# Haunted UI and Design System

## Color Palette
All colors are defined as CSS custom properties in `src/styles/theme.css`. Use these tokens everywhere — never hardcode hex values in component files.

| Token | Value | Usage |
|---|---|---|
| `--color-bg` | `#0a0a0a` | Page background |
| `--color-surface` | `#111111` | Cards, panels |
| `--color-surface-raised` | `#1a1a1a` | Elevated surfaces |
| `--color-accent-red` | `#cc2200` | GPS eye glow, danger states |
| `--color-accent-green` | `#1a3a1a` | Dark green atmosphere |
| `--color-accent-purple` | `#2d1f3d` | Desaturated purple |
| `--color-text-primary` | `#d4d4d4` | Body text |
| `--color-text-dim` | `#666666` | Secondary / unavailable |
| `--color-glow-red` | `rgba(204, 34, 0, 0.6)` | Box-shadow glow on GPS photos |
| `--color-glow-dim` | `rgba(80, 80, 80, 0.3)` | Box-shadow glow on no-GPS photos |

## Typography
- Headings: `'Creepster'` or similar horror-flavoured Google Font, loaded via `@font-face`. Fallback: `serif`.
- Body: `'Inter'`, `system-ui`, `sans-serif`.
- Monospace (coordinates, metadata values): `'JetBrains Mono'`, `monospace`.
- Base font size: `16px`. Scale: 0.75rem / 0.875rem / 1rem / 1.25rem / 1.5rem / 2rem / 3rem.

## Ghost Eye Indicators
- Photo with GPS data → red glowing eye: `box-shadow: 0 0 12px 4px var(--color-glow-red)`, red iris SVG.
- Photo without GPS data → dimmed eye: opacity `0.30`, no glow.
- Never use emoji as a substitute for the SVG eye graphic.

## Fog Particle Effect
- Rendered on `<ParticleCanvas>` using Canvas 2D (not CSS backdrop-filter blur).
- Particles: translucent white ellipses (`rgba(255,255,255,0.04)` to `rgba(255,255,255,0.08)`), 40–120 px wide, 15–40 px tall, drifting upward at 0.1–0.4 px/frame with slight horizontal drift.
- Max 60 particles on screen at once. Particles wrap when they exit the top.
- Entirely disabled (loop not started) when `prefers-reduced-motion: reduce` is active.

## Flashlight Cursor
- Mounted only at viewport width ≥ 1024 px.
- Fixed overlay `div` covering the viewport, `pointer-events: none`, `z-index: 999`.
- CSS: `background: radial-gradient(circle 150px at var(--cursor-x) var(--cursor-y), transparent 0%, rgba(0,0,0,0.92) 100%)`.
- Updated on `mousemove` via `requestAnimationFrame` to avoid jank.
- Disabled (overlay unmounted) when `prefers-reduced-motion: reduce` is active.

## Animation Rules
- All CSS transitions use `var(--transition-fast, 150ms ease)` or `var(--transition-slow, 400ms ease)`.
- Keyframe animations that move elements more than 2 px must be wrapped in `@media (prefers-reduced-motion: no-preference)`.
- Ghost character animation: continuous idle float (3 s sinusoidal vertical, ≤ 8 px displacement). Eye-closing animation plays on clean completion and must finish within 1200 ms.
- Story text reveal: character-by-character typewriter at 30 ms per character. Ghost animation pauses within 1 s of reveal completion.

## Screen-Level Rules
- Entry screen: fog particles + flashlight + privacy banner + two primary CTAs (Pick Photos, Try Sample Photos) only. No metadata yet.
- Ghost Speaks screen: dark vignette overlay, story text centered, photo eye-grid below.
- Map screen: map fills remaining height; OSM notice modal appears before first tile load.
- Blind Ghost screen: ghost eye-closing animation after all selected photos are cleaned; background desaturates to grey scale (CSS `filter: grayscale(1)` transition over 800 ms) to signal "calm state."
- All cards and panels use `border: 1px solid rgba(255,255,255,0.08)` and `border-radius: var(--radius-md, 8px)`.
- Minimum touch target size: 44 × 44 px. Applied via `.touch-target` utility class.
