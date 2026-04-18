# Stridex UI Redesign Design

**Date:** 2026-04-18
**Project:** Stridex Smart Shoe IoT Dashboard
**Status:** Approved in conversation, pending written-spec review

## Goal

Redesign the current Stridex frontend into a cleaner, more premium, beginner-friendly product experience that blends Apple-like minimalism with restrained futuristic glass styling. The first viewport should feel like a product landing hero, while the actual telemetry dashboard sits below as a calmer secondary layer.

## Design Intent

The redesign should fix the current clutter and poor visual hierarchy by reducing the number of competing elements on screen, simplifying the palette, and making motion feel intentional. The product should read as fitness-tech rather than a college project or generic admin dashboard.

The target mood is:
- Apple-like minimal structure and spacing
- Soft futuristic glass treatment on selected surfaces
- Fitness-oriented energy without loud neon or gaming visuals
- Beginner-friendly labels and hierarchy
- Smooth, premium motion instead of busy animation

## Approved Direction

### Experience Structure
- Use a **hero-first layout** rather than leading with dense analytics.
- The first screen is a **split hero**:
  - Left: headline, short supporting copy, concise CTA row, and a few small live metric chips
  - Right: a pseudo-3D rotating shoe visual inside a glass stage
- Use a **slim glass navbar** rather than a large dashboard header.
- Reveal the live dashboard below the hero through a smooth scroll transition.

### Visual Direction
- Mix **Apple minimal** and **futuristic glass** at roughly a 50/50 balance.
- Use **soft white + graphite + icy blue** as the primary palette.
- Keep the interface visually lighter, airier, and less saturated than the current build.
- Preserve a subtle fitness feel through motion, shape language, and concise activity-forward copy.

### Content Density
- Reduce the initial dashboard to only the most important metrics.
- Keep only **1-2 charts**, and treat them as secondary content rather than the visual centerpiece.
- Keep posture score and stability visualization, but present them more quietly and elegantly.

### Motion
- Add a moving background effect in the hero section using a soft orb / mesh glow.
- Add smooth scrolling and a transition from hero to dashboard.
- Use a slow 360-degree rotating shoe visual in the hero.
- Keep animations subtle and readable.

### 3D Asset Constraint
- No existing shoe model is available.
- Build the hero shoe as a **pseudo-3D visual** using layered HTML/CSS/JS composition instead of relying on a real `.glb` or external model.
- Design this so a future real 3D asset can replace it without changing the overall page layout.

## Information Architecture

### 1. Floating Navigation
Purpose: immediate brand recognition and lightweight wayfinding without taking over the page.

Contents:
- Stridex wordmark/logo text
- Small nav links such as `Overview`, `Live Metrics`, `Insights`
- Live connection status chip
- One compact CTA, likely `View Dashboard` or `Live Feed`

Behavior:
- Floats near the top with soft blur/glass styling
- Shrinks slightly or gains stronger backdrop blur on scroll
- Remains visually compact on mobile

### 2. Hero Section
Purpose: sell the product feel before showing telemetry detail.

Left column:
- Strong product headline around posture, movement, or smart gait intelligence
- One short supporting paragraph
- Primary CTA to scroll into dashboard
- Secondary CTA for live section jump
- 2-3 small live stat chips, for example steps, posture score, and activity

Right column:
- Glass showcase area for the rotating shoe visual
- Soft moving glow / orb background behind the shoe
- Optional tiny floating stat pills around the visual if they remain subtle

Behavior:
- Hero occupies first viewport on desktop
- On smaller screens, hero stacks vertically and keeps the shoe visible without dominating the screen

### 3. Dashboard Transition Section
Purpose: make the handoff from “product story” to “live data” feel intentional.

Behavior:
- Downward visual cue in hero
- On scroll, the hero content softens while the dashboard container rises into focus
- Use opacity, translate, and blur carefully; avoid heavy parallax

### 4. Minimal Live Metrics Section
Purpose: surface the live values that matter first, without overwhelming the user.

Keep visible in the first dashboard row:
- Steps
- Posture Score
- Activity
- Alerts

Optional depending on fit:
- Stability
- Current posture label

Do not lead with all current metrics equally. Remaining fields should be grouped below or folded into insight/secondary sections.

### 5. Secondary Insight and Visualization Section
Purpose: present the most useful body-state readouts in a refined, readable way.

Contents:
- Posture score ring
- Stability meter
- Short system insight panel with plain-English text
- Current posture and activity tags
- Small future-ready AI / recommendation card

Design rule:
- These components remain important, but they should no longer compete with the hero for attention

### 6. Secondary Analytics Section
Purpose: preserve live trends without making charts the star of the page.

Allowed charts:
- One compact step trend chart
- One posture or stability trend chart

Design rule:
- Charts should be clean, quiet, and visually recessed
- Lower contrast grid lines, softer fills, smaller titles
- Avoid multiple equal-weight chart panels

### 7. Diagnostics / Freshness Area
Purpose: give operational context without looking like a developer console.

Contents:
- Connection state
- Last updated / freshness
- Missing field count if relevant
- Brief diagnostic message

Design rule:
- Compact and low-noise
- Helpful to beginners
- Never visually louder than the product-facing sections

## Visual System

### Palette
Primary palette:
- Off-white / frost white for highlights and top surfaces
- Graphite / deep slate for background structure
- Icy blue for glow accents and selected focus states

Support palette:
- Soft green for healthy / positive state
- Amber for watch / degraded state
- Red only for true alert states

Rules:
- Avoid oversaturated greens and neon blues
- Avoid purple-heavy gradients
- Keep the palette calm and premium

### Typography
- Use expressive but clean typography suited to product design, not a default dashboard stack
- Large, confident hero headline
- Smaller, quiet uppercase labels where needed
- Very readable metric values with clear unit treatment

### Shape and Surface Language
- Rounded corners, but not toy-like
- Thin borders, soft glass blur, and selective highlights
- Large spacing blocks to reduce clutter
- Strong alignment and rhythm across sections

## Motion Design

### Hero Background Motion
- Use a slow animated orb / mesh glow behind the hero
- Motion should feel ambient and premium, not interactive art-first
- Must not interfere with text legibility

### Shoe Rotation
- Pseudo-3D shoe rotates slowly on a continuous loop
- Slight tilt and depth illusion allowed
- Motion should resemble product showroom rotation rather than a fast spinner

### Scroll Behavior
- Smooth anchor scroll from hero CTA to dashboard
- Hero-to-dashboard transition can include subtle fade, translate, and blur
- Motion should respect reduced motion preference where practical

### Live Update Motion
- Metric values can pulse subtly on update
- Keep transitions under control; no bouncing or oversized counters
- Charts should animate softly when new points arrive

## Data Model and Content Mapping

Firebase source remains unchanged:
- `stridex/distance`
- `stridex/steps`
- `stridex/roll`
- `stridex/avgRoll`
- `stridex/postureScore`
- `stridex/stability`
- `stridex/walked`
- `stridex/alerts`
- `stridex/posture`
- `stridex/activity`

Display priority:
- Hero chips: `steps`, `postureScore`, `activity`
- Primary dashboard cards: `steps`, `postureScore`, `activity`, `alerts`
- Secondary visualization: `postureScore`, `stability`, `posture`, `activity`
- Secondary charts: `steps` + one of `postureScore` or `stability`
- Diagnostics: freshness, missing values, connection state, optionally `distance`

`roll` and `avgRoll` remain available but should no longer be first-class headline metrics unless they contribute directly to the posture visualization.

## Component Responsibilities

### `index.html`
- Define the new semantic page structure
- Add floating nav, hero, dashboard sections, and motion scaffold
- Keep sections clearly separated by role: hero, primary metrics, secondary insights, secondary charts, diagnostics

### `style.css`
- Rebuild the design system around the new palette and spacing
- Implement glass surfaces, hero layout, animated background, scroll-reveal styling, and responsive behavior
- Ensure the dashboard is visually calmer than the current version

### `script.js`
- Keep Firebase read logic intact from the frontend perspective
- Re-map data into the new UI hierarchy
- Drive hero stat chips, dashboard cards, posture/stability visuals, scroll transitions, and chart updates
- Keep state updates efficient and avoid layout thrash

### `dashboard-core.mjs`
- Retain and adapt normalization / insight logic as needed
- Keep chart history buffering and semantic status helpers reusable
- Support the simplified analytics prioritization

## Pseudo-3D Shoe Strategy

Because there is no real 3D asset yet, the hero shoe should be built as a layered illusion:
- Main shoe body shape built from nested divs and gradients
- Sole, heel, lace zone, and accent panels as separate layers
- Perspective and rotate transforms applied to the full component
- A slow `rotateY`-style loop simulated through CSS/JS transforms
- Shadow and glow planes below the shoe for depth

The component should be isolated enough that a future real model can replace it without redesigning the hero layout.

## Responsive Strategy

### Desktop
- Split hero layout remains two-column
- Dashboard uses larger white space and restrained panel grouping

### Tablet
- Hero can remain split if space allows, otherwise stack with text first and shoe second
- Primary metrics stay compact and readable

### Mobile
- Navigation simplifies but remains visually premium
- Hero stacks vertically
- Shoe visual scales down without breaking layout
- Primary metrics remain visible high on the page
- Secondary charts move lower and retain reduced emphasis

## Error and Empty States

If Firebase config is missing:
- Show a clean setup-required state without breaking layout

If connection drops:
- Show a compact but visible status chip and diagnostic message

If data is partially missing:
- Preserve layout and show “No data yet” where appropriate
- Do not let missing fields create visual imbalance

If no telemetry has arrived yet:
- Hero and layout should still feel finished and premium
- Cards and charts should show graceful empty-state styling

## Beginner-Friendliness Rules

- Use plain language labels
- Keep the first dashboard row understandable in under 3 seconds
- Avoid exposing raw engineering terminology unless it adds value
- Never let diagnostics overwhelm product information

## Accessibility and UX Rules

- Preserve strong text contrast despite glass styling
- Motion should be subtle and preferably reduced when user preferences require it
- Keyboard focus styles must remain visible
- Dashboard cards and hero CTAs must remain readable on smaller screens

## Testing and Verification Expectations

Design verification should check:
- Hero-to-dashboard hierarchy feels clean and not cluttered
- The hero visual remains legible and attractive across desktop and mobile
- Connection and empty states still look intentional
- Charts remain secondary and visually quiet
- Live value updates do not create flicker
- Scroll transition feels smooth rather than distracting

Implementation verification should include:
- Existing data normalization and insight tests remain valid or are updated intentionally
- Script syntax checks still pass
- Manual browser check for spacing, motion, and responsive layout

## Out of Scope

- Backend or firmware changes
- New Firebase schema
- Real 3D model integration
- AI-generated recommendations beyond a placeholder future-ready block
- Framework migration away from plain HTML/CSS/JS

## Notes

- Visual companion browser tooling was attempted during brainstorming, but local environment restrictions prevented launching the helper server. The approved direction above is based on validated text design decisions from the user.
- If `.superpowers/` is used for mockups or planning artifacts, add it to `.gitignore` before keeping those files in the repo root.

