# Admin login visual QA

final result: passed

## Reference and evidence
- Source: user-supplied login reference attached in this conversation (1494 × 914). Requested deviations: Anchor Into Presence branding; button #514C40; right background #EEECE5; replace blue/green palette.
- Implementation: http://localhost:3022/admin/login
- Desktop screenshot: ../output/admin-login/desktop.png, 1494 × 914 CSS pixels, device scale 1.
- Mobile screenshot: ../output/admin-login/mobile.png, 390 × 844 CSS pixels, device scale 1. Also checked width 320 for overflow.
- State: empty signed-out form. Compared attached reference with desktop screenshot at matching dimensions. Controls and typography are readable in the full-size capture; separate region enlargement was not needed.

## Comparison and fixes
- Initial P1: generated transparent panel mask lost its opaque interior, making branding illegible. Replaced with opaque two-color raster mask in luminance mode. Recaptured and verified solid brand panel and smooth divider.
- Initial P2: mobile header expanded into unused space. Set grid rows to auto / 1fr. Recaptured and verified compact header.
- No remaining actionable P0/P1/P2 findings.

## Required surfaces
- Typography: existing app font; centered uppercase sign-in heading, welcome message on left. Deliberate branding copy substitution.
- Layout: centered split card with 1120px maximum width and white outer page background, organic vertical divider, brand at upper left, centered right form, rounded fields/button, footer beneath. Visible field labels retained for accessibility. Mobile stacks header and form.
- Color: computed styles verify button rgb(81, 76, 64), right panel rgb(238, 236, 229). Neutral brown/cream replaces reference blue and previous green.
- Assets: existing app logo; generated raster divider mask. No reference SSO logo or claims carried over.
- Content: app-specific email/password sign-in; no nonfunctional forgot-password link added.

## Checks
- TypeScript passed.
- Browser: validation and first-invalid-field focus; password show/hide by keyboard; loading lock; mocked invalid-credentials recovery; no horizontal overflow at 320px.
- Successful mocked login storage and dashboard navigation passed before visual-only revision; login logic unchanged in this revision.
- Real account credentials were not used.

## Follow-up polish
- None required for this scope.

Latest requested adjustment: reduced card maximum width from 1440px to 1120px; outer background #FFFFFF. Desktop and mobile browser checks passed and screenshots refreshed.

Latest palette adjustment: left panel and mobile brand header are white (#FFFFFF); branding and welcome text are #514C40. Right panel remains #EEECE5 and button #514C40. Refreshed desktop/mobile captures and browser checks passed.

User correction: restored left panel/mobile header to #514C40 with light text; changed right panel and shell to #FFFFFF. Outer background remains white. Prior captures show the superseded color choice; visual recapture pending. CSS diff check passed.

Correction verified: desktop recaptured and visually checked, mobile/browser interaction checks passed. Right panel computed color #FFFFFF; screenshots refreshed.
