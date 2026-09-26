# Brand pages (demonstration)

Several brands on one Astro + Tailwind codebase, one Vercel project per brand, edited by
non-developers through Claude Code.

- Pages: `apps/<brand>/content/pages/*.yaml`, assembled from the brand's section library.
- Shared packages: `packages/tracking` (GA4, Google Ads, GTM, Consent Mode v2, UTM/gclid) and
  `packages/forms` (ActiveCampaign and MailerLite behind one interface, destination chosen on the server).
- Every pull request: page check, unit tests, builds, link check, tracking and forms in a real
  browser for each brand, brand separation. A preview is deployed after the checks pass.
- Every merge to `main`: the live build is deployed without the live domain, checked in a browser,
  then promoted.

This copy is a demonstration: tracking IDs are placeholders and the form adapters build the
provider requests without sending them.

## Credits
- Texts and photos of the Vertical Printers pages: verticalprinters.com, used for this demonstration
  only; they remain the property of Vertical Printers.
- Fonts: Fira Sans (Mozilla Foundation and Telefonica, SIL Open Font License) and Poppins
  (Indian Type Foundry, SIL Open Font License); licenses in `brands/vertical-printers/assets/fonts/`.
