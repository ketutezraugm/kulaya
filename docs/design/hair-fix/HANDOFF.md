# Fix: the customer's hair in the Kulaya landing illustration

**For:** Claude Design (illustration fix). **Scope:** one drawing, one character, one defect. Everything else in the file stays byte-for-byte as it is.

## 1. What is wrong

File: `ill-landing-hero.svg` (viewBox `0 0 390 300`), the warung "BAKSO BU SRI" scene. The **customer on the left** (woman in the yellow top, standing in front of the counter) has a bob haircut that was drawn with a broken fringe. See `problem-screenshot.png` (how it looks in the app) and `before-customer.png` / `before-customer.svg` (the customer alone, enlarged).

What a viewer sees: a dark helmet of hair with **odd skin-coloured slivers on the forehead**: a large skin crescent to the left of a small dark "wedge" and a tiny sliver to its right. It reads as a bald patch or a mis-drawn parting, not as a fringe.

Root cause in the source (customer group `<g transform="translate(30 120) scale(0.9)">`, drawn in a 120 × 140 local box):

1. **The fringe is a narrow pointed wedge**, path `M44 48C52 46 60 40 64 34C68 42 74 46 78 48`. Its apex is at x = 64, **4 units right of the face centre (x = 60)**, so the shape is lopsided, and its base is only 34 units wide and ends *inside* the face, so it never joins the back hair. That leaves the skin crescent above-left and the sliver above-right.
2. **The forehead is open.** The face oval (`M60 34C48 34 42 44 42 58 …`) is drawn on top of the back hair and starts at y = 34, so skin shows between the face's top edge and the fringe wherever the wedge does not cover it.
3. The fringe is drawn with a **2.5 stroke** while every other filled shape in the figure (hair, face, top, neck) uses **3**.

Nothing else about the character needs to change: the bob silhouette, the face, the eyes, the smile, the neck, the yellow top and the lilac offset shadow are fine.

## 2. What it should look like

A clean, confident **bob with a full fringe (bangs)**, in the same flat hand-drawn style as the other characters:

- One continuous hair mass: the fringe **joins the back hair on both sides** (same fill `#1E2A5A`, no visible seam, no outline between fringe and back hair).
- The fringe is **symmetrical about the face centre (x = 60)** or clearly, deliberately side-swept. No off-centre point.
- Its bottom edge is a **soft arch** that sits about 8–10 units above the eyes (eyes are at y = 61, so the fringe's lowest point should be near y = 50–53) and covers the whole forehead: **no skin visible above the fringe**.
- The side hair keeps the current bob silhouette (rounded ends at jaw level). Ears stay hidden.
- Outline weight 3, `stroke-linejoin="round"`, `stroke-linecap="round"`, like the other filled shapes in the scene.

## 3. Reference solutions (use as a starting point; improve if you can)

Both are already rendered and checked in this folder:

- `reference-fix-A.svg` / `reference-fix-A.png`: symmetric arched fringe. Replaces only the fringe path with:
  `M41 58C39 44 46 32 60 32C74 32 81 44 79 58C75 52 69 50 60 50C51 50 45 52 41 58Z` (fill `#1E2A5A`, stroke `#1E2A5A`, stroke-width 3, round joins and caps).
- `reference-fix-B-sidesweep.svg`: a gently side-swept fringe, a little more natural:
  `M41 60C38 44 46 31 60 31C74 31 82 44 79 60C76 54 71 52 66 51C61 50 56 51 51 53C47 55 44 57 41 60Z`

Pick one, or draw something better. The requirement is the look in section 2, not these exact numbers. Keep the paint order: back hair, then face oval, then fringe on top.

## 4. Style references (so it matches the family)

- `ref-people-bu-sri.svg`: the shop owner (blue hijab), in the same scene's art family.
- `ref-people-mas-dimas.svg`: Mas Dimas, the male character from the same art set.
- Palette (do not add colours): ink/nila `#1E2A5A`, nila `#2F3F86`, kunyit (turmeric) `#F2B33D`, skin `#DDA77A`, lilac shadow `#C9CFEA`, paper `#FBF7EF`. Flat fills only. No gradients, no highlights, no extra detail lines in the hair.

## 5. Hard constraints (the same rules as the rest of the art set)

- Output a **complete replacement `ill-landing-hero.svg`**: same `viewBox="0 0 390 300"`, same element order, same IDs (there are none, so don't add any), **no `<metadata>` block, no width/height on the root `<svg>`**.
- The `<text>` element "BAKSO BU SRI" stays as is (it is inlined in the app so the page font applies). Do not convert it to outlines.
- **Do not touch anything outside the customer's hair**: not the stall, the owner, the jar, the bowls, the phone, the QR panel, the stool, positions, sizes or colours.
- No emoji, no stock imagery, no filters, no gradients, no opacity tricks.
- Keep the file small (the original is 12 KB; the result should be within about 1 KB of that).

## 6. Deliver

1. `ill-landing-hero.svg` (the full fixed scene).
2. A PNG preview of the whole scene at 1200 px wide, and a close-up of the customer at 560 px wide, so the result can be checked at a glance.
3. One line stating which fringe you chose (A, B or your own) and the final `d` of the fringe path.

## 7. Acceptance checklist

- [ ] No skin visible above the fringe; the forehead is fully covered.
- [ ] Fringe and back hair read as one hair shape (no seam, no notch where they meet).
- [ ] The fringe is symmetrical about x = 60, or visibly intentional if side-swept.
- [ ] The customer's face, eyes, smile, neck and top are unchanged.
- [ ] Every other element in the scene is identical to the original (diff the file: only the hair path(s) of the customer group differ).
- [ ] Stroke width 3 with round joins and caps; same colours as before; no new colours.
- [ ] Viewed at 400 px wide (the size it appears on the landing page) the hair looks clean, not blobby.

## 8. After delivery (done on our side, no action for you)

The fixed file replaces `app/assets/art/scene/ill-landing-hero.svg`, then `node scripts/build-art.mjs` regenerates the inlined component, and the site is redeployed. The same drawing is also on slide 1 of the pitch deck PDF, which would be re-exported separately if wanted.
