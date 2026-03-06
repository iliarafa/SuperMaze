# CRT Arcade Redesign — White Phosphor / Space Invaders

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Restyle all UI screens to an 80s monochrome CRT arcade aesthetic (Space Invaders feel) with Press Start 2P pixel font, white-on-black palette, and sharp edges.

**Architecture:** Add a `UIColors` palette and `UI_FONT` constant alongside the existing `Colors` object. UI components use the new monochrome palette; canvas game rendering keeps existing colors for gameplay clarity. No new dependencies beyond the Google Font.

**Tech Stack:** React inline styles, Press Start 2P (Google Fonts), existing Vite build

---

### Task 1: Font + Theme Foundation

**Files:**
- Modify: `index.html`
- Modify: `src/game/colors.ts`
- Modify: `src/index.css`

**Step 1: Add Google Font link to index.html**

Add before the closing `</head>`:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel="stylesheet" />
```

**Step 2: Add UIColors and UI_FONT to colors.ts**

Append after the existing `Colors` export:
```ts
export const UIColors = {
  bg: '#0a0a0a',
  primary: '#e0e0e0',
  dim: '#707070',
  highlight: '#ffffff',
} as const;

export const UI_FONT = '"Press Start 2P", monospace';
```

**Step 3: Update index.css background**

Change `background-color: #050A14` to `background-color: #0a0a0a`.

**Step 4: Verify**

Run: `npm run dev`
- Page loads with darker black background
- No visual regressions yet (components not updated)

**Step 5: Commit**

```bash
git add index.html src/game/colors.ts src/index.css
git commit -m "feat: add Press Start 2P font, UIColors palette, and UI_FONT constant"
```

---

### Task 2: Redesign LandingPage

**Files:**
- Modify: `src/components/LandingPage.tsx`

**Step 1: Rewrite LandingPage**

Replace the entire component. Remove:
- Canvas particle animation
- `Particle` interface
- All refs for canvas/particles/raf
- Gradient divider line
- System font references

Replace with a simple static layout:
- Import `UIColors` and `UI_FONT` from `../game/colors`
- Full-screen flex column, centered, `backgroundColor: UIColors.bg`
- "SUPER" text line: `UI_FONT`, `~1.2rem`, `UIColors.primary`
- "MAZE" text line: `UI_FONT`, `~1.4rem`, `UIColors.highlight` (white, slightly larger for emphasis)
- Subtitle "classical vs quantum search": `UI_FONT`, `~0.4rem`, `UIColors.dim`
- "TAP TO START": `UI_FONT`, `~0.45rem`, `UIColors.primary`, keep `pulse` keyframe animation
- Keep `onTouchEnd` and `onClick` handlers on wrapper div
- Keep safe-area padding

**Step 2: Verify**

Run: `npm run dev`
- Landing: black screen, white pixel text, blinking "TAP TO START"
- Tap advances to mode select

**Step 3: Commit**

```bash
git add src/components/LandingPage.tsx
git commit -m "feat: redesign LandingPage with CRT arcade aesthetic"
```

---

### Task 3: Redesign ModeSelect

**Files:**
- Modify: `src/components/ModeSelect.tsx`

**Step 1: Update ModeSelect and ModeCard**

Changes:
- Replace `font` constant with import of `UI_FONT` and `UIColors`
- "SELECT MODE" heading: `UI_FONT`, `~0.6rem`, `UIColors.highlight`, uppercase
- **ModeCard**: `borderRadius: 0`, `border: 1px solid UIColors.primary`, `background: 'none'` (no gradient). Title: `UIColors.highlight`, `~0.5rem`. Description: `UIColors.dim`, `~0.4rem`. Remove color-coded borders (no `color` prop styling on border/title).
- "HOW TO PLAY" button: `borderRadius: 0`, `border: 1px solid UIColors.primary`, `color: UIColors.primary`, `UI_FONT`, `~0.4rem`
- "BACK" button: `color: UIColors.dim`, `UI_FONT`, `~0.35rem`
- Remove `hexToRgb` function
- Keep the `color` prop on ModeCard but only use it for an optional small accent — or remove entirely. The monochrome UI shouldn't use game colors.

**Step 2: Verify**

Run: `npm run dev`
- Mode select: sharp white-bordered cards, pixel font, monochrome
- Both cards tap through to game correctly

**Step 3: Commit**

```bash
git add src/components/ModeSelect.tsx
git commit -m "feat: redesign ModeSelect with CRT arcade aesthetic"
```

---

### Task 4: Redesign HowToPlay

**Files:**
- Modify: `src/components/HowToPlay.tsx`

**Step 1: Update HowToPlay and sub-components**

Changes:
- Replace `font` constant with import of `UI_FONT` and `UIColors`
- All text: `UI_FONT` with reduced font sizes
- Back button: `UIColors.primary`, `UI_FONT`, `< BACK` (ASCII arrow instead of `&larr;`)
- "HOW TO PLAY" heading: `UIColors.highlight`, `~0.6rem`
- **Section** titles: `UIColors.primary`, `~0.45rem`. Body: `UIColors.dim`, `~0.35rem`
- **ModeSection** cards: `borderRadius: 0`, `border: 1px solid UIColors.primary`, `background: 'none'` (no gradient). Title: `UIColors.highlight`. Rules list: `UIColors.dim`. Insight: `UIColors.dim`, lower opacity.
- **Row** icons: Replace `👆` with `>`, `👉` with `>` (ASCII characters)
- **Divider**: Replace gradient with `{ width: '40px', height: '1px', backgroundColor: UIColors.dim }`
- **ColorRow**: Keep colored squares (visual legend for canvas), label text in `UIColors.primary`
- Remove `hexToRgb` function

**Step 2: Verify**

Run: `npm run dev`
- How to Play page scrolls correctly on iOS
- All text readable at pixel font sizes
- No emoji — ASCII only
- Color legend squares still show game colors

**Step 3: Commit**

```bash
git add src/components/HowToPlay.tsx
git commit -m "feat: redesign HowToPlay with CRT arcade aesthetic"
```

---

### Task 5: Restyle Game HUD

**Files:**
- Modify: `src/components/MazeRenderer.tsx`

**Step 1: Update HUD styling**

Changes:
- Replace local `font` constant with import of `UI_FONT` and `UIColors`
- Race header text: `UI_FONT`, `~0.6rem`, `UIColors.highlight` (use white for all states instead of color-coded — the text content itself tells you the state)
- Comparison stats bar: `UI_FONT`, `~0.35rem`, `UIColors.primary` for labels. Keep colored `<strong>` values (`Colors.classicalPath`, `Colors.exitNode`) since they correspond to canvas colors.
- Adjust `fontWeight` values — Press Start 2P only has weight 400, so remove all `fontWeight: 200/300/500` settings

**Step 2: Verify**

Run: `npm run dev`
- Start a race game — header shows "HUMAN" in white pixel font
- Complete the maze — stats bar shows with pixel font, colored values

**Step 3: Commit**

```bash
git add src/components/MazeRenderer.tsx
git commit -m "feat: restyle game HUD with CRT arcade aesthetic"
```

---

### Task 6: Final Verification

**Step 1: Build check**

Run: `npm run build`
Expected: Clean build, no TypeScript errors

**Step 2: Test suite**

Run: `npm test`
Expected: All existing tests pass (they test game logic, not styles)

**Step 3: Visual walkthrough**

- Landing → ModeSelect → HowToPlay → back → Race → complete → stats
- Landing → ModeSelect → Observe & Collapse → charge → collapse → travel
- Confirm all screens are monochrome white-on-black with pixel font
- Confirm maze canvas still renders with original game colors
