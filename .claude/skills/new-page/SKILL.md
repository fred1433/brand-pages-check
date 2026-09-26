---
name: new-page
description: Create or duplicate an ordinary page for a brand.
disable-model-invocation: true
argument-hint: "[brand] page to create or copy"
---

The owner wants a page: $ARGUMENTS

Same rules as /new-landing-page. When duplicating a page, keep every form's `form:` setting unless
the owner asks for another configured destination, and change the title and description so the two
pages can be told apart in Google. Then check, commit, push and open a pull request as in CLAUDE.md.
