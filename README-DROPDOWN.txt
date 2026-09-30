# StudyOS dropdown fix

Root cause:
After app routes became lazy-loaded, StudySelect portal styling could no longer
depend on CSS from unrelated pages being loaded up-front.

This patch makes StudySelect own its structural CSS.

Files:
- client/src/components/StudySelect.jsx
- client/src/components/StudySelect.css

What it fixes:
- portal positioning
- dropdown z-index
- dropdown opening in the correct place
- menu overflow / scrolling
- option layout
- selected state
- color dots
- chevron state
- light/dark styling
- keyboard ArrowUp / ArrowDown navigation
- Escape close
- first-paint menu jump

Existing page-specific CSS is still allowed to customize individual triggers.

Apply:
Expand the zip and copy it over the StudyOS repo root, then restart Vite.
