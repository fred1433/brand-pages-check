---
name: new-landing-page
description: Create a new landing page for a brand from its existing sections.
disable-model-invocation: true
argument-hint: "[brand] what the page is for"
---

The owner wants a new landing page: $ARGUMENTS

1. Work out the brand (ask if unclear) and read `brands/<brand>/catalog.json` for the sections,
   images, quotes and the forms set up in `brands/<brand>/brand.config.json`.
2. If the page needs something the library does not have (a new section type, a new form
   destination), say so and ask how to proceed before writing anything.
3. Pick a short page address and write `apps/<brand>/content/pages/<address>.yaml`, reusing the
   brand's own wording where it fits. Every form section must say which configured form it uses.
4. Run `pnpm -s check:pages` and fix what it reports.
5. Follow "How a change goes live" in CLAUDE.md up to the pull request, then summarise for the owner:
   the page address, the sections used, where the form's entries go (preview and live), and what
   was not touched.
