# Community new-post badge

The Community tab counts posts by other users added since the user's last
successful Community visit. It uses the same themed Badge as the Home bell,
hides zero, and caps display at 99+. Likes and comments do not contribute.

GET /api/users/community/activity returns newPostCount for the authenticated
user across all feed pages, excluding missing authors as the feed does. First
use establishes a baseline so historical posts do not become a backlog.
PATCH accepts visitedThrough from a successful posts response and advances
User.communityVisitedAt monotonically. Both endpoints require a user bearer
token; the client cannot select another user. State persists across devices.

GET /api/users/community/posts now returns visitedThrough, captured before
querying posts; the feed query is bounded by that timestamp. A visit acknowledges
new posts through this boundary, not individual scroll impressions. Posts added
after the boundary remain new. Opening a shared post does not acknowledge a visit.

The app refreshes the count at startup, tab changes, resume, and every 60 seconds
while foregrounded. The Community feed reloads on tab re-entry and resume. Only
a successfully loaded, active, foreground Community feed acknowledges a visit.
Failed requests retain the last confirmed count. Older servers without
visitedThrough continue to show the feed without the badge feature.

Deploy the backend before releasing the mobile app. No migration is required;
the user baseline is initialized lazily. This does not change notification read
state or the OS app icon badge.
