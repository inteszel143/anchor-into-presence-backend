# Daily Anchor upload fix — October 7, 2026

Live logs showed repeated `Request body exceeded 10MB` warnings followed by
`Failed to parse body as FormData` on activity creation. Next 15.5.20 ignored
`proxyClientMaxBodySize`, the Next 16 setting, and used its default 10 MB buffer.

Release `302fc96b48f1eb31a2da111945a536850b964bfe` selects
`middlewareClientMaxBodySize` for Next 15 and `proxyClientMaxBodySize` for Next 16.
The intended limit is 100 MiB for the entire multipart request, including media,
thumbnail and fields. Nginx already permits 250M. Dependencies were retained.

Deployed through the existing rollback-capable script. All 42 tests and the
production build passed. An isolated 12 MiB multipart test against production's
Next library reproduced truncation with the default and parsed the complete file
with the corrected limit. The built live config normalizes the limit to
104857600 bytes. Public admin login returned HTTP 200. No real activity was
created during testing; a complete authenticated client upload remains to be tried.

Release branch: `codex/upload-limit-20261007` (pushed to the existing GitHub repo).
Previous release retained: `/var/www/meditation-deploy/releases/c7b6859b3f5c.asvW2N4R`.
