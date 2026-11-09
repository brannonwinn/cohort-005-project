# Which notification provider should Cadence use?

Research for issue #2 (part of map #1). Researched 2026-11-09 against official docs, pricing pages and the published npm packages. Prices and limits change, so check the pricing pages again before you sign up.

Standing decisions from the map: the provider is the **only** store of Notifications, the Notification Feed is the only channel, Notifications only cover things that just happened, and there are no preferences.

## Recommendation

**Knock.** Runner-up: **Novu.**

Knock is the best fit for these reasons:

- **Free tier.** 10,000 messages a month, with unlimited environments and unlimited seats.
- **React 19.** `@knocklabs/react` declares React 19 as a peer dependency, and it is built on Radix like Cadence's own UI.
- **No user sync.** Cadence can send each user's details with the trigger call itself ("inline identification"), so it never has to sync users separately.
- **Signed tokens without a network call.** The server signs the feed token itself with an RS256 key.
- **Real-time feed.** Updates arrive over a websocket.
- **Full set of message states.** It covers seen, read, unread, interacted and archived, and archiving can be undone.
- **Test mode.** `sandbox_mode` runs a trigger without delivering anything.

Novu comes a close second. It has the same 10k/month free volume, explicit React 19 support, rich headless hooks, a simple HMAC token and the option to self-host. It loses on the free tier: 2 environments, 3 team members and 24-hour activity log retention.

## Comparison

| Criterion | Knock | Novu | MagicBell | Courier | SuprSend |
| --- | --- | --- | --- | --- | --- |
| Free tier | 10k messages/mo; unlimited environments and seats [1] | 10k workflow runs/mo; 20 workflows; 2 environments (Dev/Prod); 3 team members; 24h activity retention [2] | 1k deliveries/mo; 1 project [3] | 10k sends/mo; test sends are billable [4][21] | 10k notifications/mo; in-app feed shows SuprSend branding [5] |
| React feed package (latest) | `@knocklabs/react` 0.15.1 | `@novu/react` 3.19.2 | `@magicbell/react` 1.14.0 | `@trycourier/courier-react` 9.3.3 | `@suprsend/react` 1.5.0 |
| React 19 support (npm `peerDependencies`) | `^17 \|\| ^18 \|\| ^19` (Next and TanStack Router are optional peers) | `^18 \|\| ^19`; docs say React 19 is supported [7] | No React peer declared. The older `@magicbell/magicbell-react` declares `>= 18.3.1` | `>=18.0.0` | `>= 16.8.0` |
| Headless API | `useNotifications` + `useNotificationStore`; `@knocklabs/client` feed methods [8][9] | `useNotifications` / `@novu/js` [10] | Hooks/context in `@magicbell/react`; `magicbell-js` client | `useCourier()` hook / `@trycourier/courier-js` [11] | `@suprsend/react-core` hooks / `@suprsend/web-sdk` |
| Server trigger from Node | `@knocklabs/node` 1.41.0, workflow trigger [12] | `@novu/api` 3.19.1, `novu.trigger()` (`@novu/node` is deprecated) [13] | REST `POST /v2/broadcasts`; `magicbell-js` [14] | `@trycourier/courier` 10.0.0 | `@suprsend/node-sdk` 1.15.1, `workflows.trigger()` [15] |
| User identity on trigger | Inline identification: recipient objects are upserted before the workflow runs, so no prior sync is needed [16] | `to` accepts a subscriber object. The docs only confirm auto-creation for `actor`. The Inbox creates the subscriber on first session [7][13] | Recipients by email / external_id. Auto-creation is not documented | Recipient by `user_id` | "Doesn't require user creation beforehand"; recipients are inline objects [15] |
| Feed auth in the browser | Public key + user ID. Turn on "enhanced security" to require a **RS256 JWT** (`sub` = user id), signed locally with `signUserToken` from `@knocklabs/node`. The default expiry is 1h, and `onUserTokenExpiring` handles refresh [6] | `applicationIdentifier` + `subscriberId`. Turn on HMAC to require `subscriberHash = HMAC-SHA256(secretKey, subscriberId)`, which never expires [17] | **HS256 user JWT** with `user_external_id` / `user_email` + `api_key`, signed locally with the project secret [18] | JWT minted by **calling Courier's `POST /auth/issue-token`** (scopes `user_id:…`, `inbox:read:messages`, `inbox:write:events`). Tokens never expire unless you set `expires_in`, and the SDK does not refresh them [19] | Public key + `distinctId`. Turn on enhanced security to require an **ES256 JWT** signed locally, with a `refreshUserToken` callback [20] |
| Live updates | Websocket. `listenForUpdates()` and the `items.received.realtime` event; inactive tabs can disconnect automatically [8][9] | WebSocket, injected into the `useNotifications` list automatically. A `realtime` prop can turn it off [10] | "Persistent connection", new items appear without refresh [22]. The package depends on `reconnecting-websocket` | WebSocket, only after `inbox.listenForUpdates()` [11] | Socket (`socket.io-client`). The feed disconnects after 1 minute in a hidden tab (`disconnectWhenHidden`) [23] |
| Read / unread / archive | seen, read, interacted, archived. `markAsRead/Unread/Seen/Unseen/Archived/Unarchived`, `markAllAsSeen`; `unread_count` / `unseen_count` metadata [8][9][24] | `read`, `unread`, `seen`, `archive`, `unarchive`, `snooze`, `delete`; `readAll`, `seenAll`, `archiveAll`, `archiveAllRead` [10] | read, seen, archived states with `read_at`/`seen_at` [25] | `read`, `unread`, `archive`, `readAll` [11] | `markAsRead/Unread/Seen/Archived/Interacted`, `markAllAsRead` (found in the `@suprsend/web-sdk` 5.4.0 bundle) |
| Testing / local dev | Unlimited environments, so you can have one per developer or CI. `settings.sandbox_mode` "generates and previews the messages without delivering them"; dashboard test runner; Knock CLI `workflow run` [1][26] | Dev + Prod environments; open source and self-hostable with Docker (includes a `ws` service) [27] | 1 project on the free tier | Test and Production environments with separate keys. Test sends are billed; mock keys are Enterprise-only [21] | Workspaces (staging/production) |

## Notes per provider

### Knock (recommended)

- **No user sync.** Inline identification means a trigger like `recipients: [{ id: user.id, name, email }]` creates or updates the Knock user before the workflow runs, and Knock "guarantees that recipients are identified before executing any other action" [16]. Cadence keeps no provider user table and needs no sync job, which matches "the provider is the only store".
- **Local token signing.** `signUserToken(userId, { signingKey, expiresInSeconds })` runs in the loader. It needs no network round-trip and no Knock call during SSR [6].
- **Enhanced security matters.** Without it, "a request with your public key can act as any user" [6]. It can stay off in development and must be on in production.
- **Opening the popover marks items seen.** "By default the feed will mark all items as seen when the feed popover opens" [24]. Use `badgeCountType="unread"` on the badge if Cadence wants the bell to show unread rather than unseen.
- **Message lifetime is a gap.** The docs I read do not cover how long in-app feed messages are kept.
- **Dependencies.** `@knocklabs/react` pulls in `@radix-ui/react-dialog`, `@radix-ui/react-hover-card` and Knock's own `@telegraph/*` design packages (from npm `dependencies`).

### Novu (runner-up)

- **Strengths:**
  - Explicit React 19 support.
  - The richest headless hook (includes snooze and bulk archive).
  - Open source, with a Docker self-host for fully local development [27].
  - The simplest secure auth: one HMAC line with `node:crypto` [17].
- **Weaknesses:**
  - The free tier allows only 2 environments and 3 team members [2].
  - The `subscriberHash` never expires.
  - Removing Novu branding needs a paid plan [17].
  - `Idempotency-Key` "is not enabled for all organizations" [13].

### MagicBell

- **Low free volume.** Only 1,000 deliveries a month and one project [3]. That is tight for development and leaves no separate test project.
- **Unclear React compatibility.** The current `@magicbell/react` declares no React peer range at all, so its React 19 compatibility is neither stated nor ruled out.

### Courier

- **Token minting costs a request.** Feed auth needs a server-to-Courier HTTP call to mint each token, and tokens never expire by default [19].
- **No free testing.** Test sends are billable, and mock keys are Enterprise-only [21].
- **Packaging churn.** The old `@trycourier/react-inbox` is deprecated in favour of `@trycourier/courier-react`.
- **Client-side only.** The docs say Inbox "render[s] client-side only" [11].

### SuprSend

- **Capable but unproven on React 19.** It has local ES256 signing, inline recipients, an idempotency key on triggers [15][20] and a full set of states. It declares React `>= 16.8.0`, but nothing in its docs states React 19 support.
- **Recent package churn.** `@suprsend/react-inbox` is deprecated in favour of `@suprsend/react` [23].
- **Branding.** The free feed carries SuprSend branding [5].

## Facts for the map's "Not yet specified" questions

- **Live updates vs page-load refresh.** All five providers push over a websocket, so live updates are effectively free.
  - With Knock, `KnockFeedProvider` connects the socket itself, and headless code calls `feedClient.listenForUpdates()` [8][9].
  - The feed SDKs are browser clients. Courier says its Inbox renders client-side only [11], and none of the others document SSR. **Inference, not stated in the docs:** in React Router SSR, render the feed client-side only (after hydration), and SSR just the bell placeholder.
- **Testing.**
  - No provider ships an in-process fake or emulator. **Inference:** the practical Vitest approach is to put the provider behind a small Cadence module (for example `notify(event, recipients, data)`) and fake that module in tests.
  - With Knock, real-API integration checks can use a dedicated environment (unlimited on the free tier) and `settings.sandbox_mode` [1][26].
  - Novu's self-hosted Docker stack is the only true local option [27].
- **Dev experience and identity.**
  - Use the Cadence user id as the provider user id (Knock `id` / `sub`). When the DevUI panel switches user, the root loader returns a new `userId` and a newly signed token, and `KnockProvider` re-authenticates; calling `authenticate` again "restarts the real-time connection" [6].
  - Inline identification on trigger means **seed data needs no provider calls** to create users. A user who has never received a Notification simply has an empty feed.
  - Seeding Notifications into the provider is possible, but it would use up the 10k/month quota on every reseed.
- **Read/unread/archive.**
  - Knock tracks seen, read, interacted and archived as separate states [24].
  - Defaults: opening the popover marks everything seen, and the default badge counts unseen [24]. Clicking an item and archiving are actions Cadence wires up, with `markAsRead`, `markAsArchived` and so on [9].
  - Cadence still has to decide three things: badge on unseen or unread, mark read on click, and whether to show archive.

## Sources

1. Knock pricing: https://knock.app/pricing
2. Novu pricing: https://novu.co/pricing
3. MagicBell pricing: https://www.magicbell.com/pricing
4. Courier pricing: https://www.courier.com/pricing
5. SuprSend pricing: https://www.suprsend.com/pricing
6. Knock, security and authentication: https://docs.knock.app/in-app-ui/security-and-authentication
7. Novu Inbox overview: https://docs.novu.co/platform/inbox/overview
8. Knock feeds overview: https://docs.knock.app/in-app-ui/feeds/overview and the headless React feed: https://docs.knock.app/in-app-ui/react/headless/feed
9. Knock JS client README: https://github.com/knocklabs/javascript/blob/main/packages/client/README.md
10. Novu `useNotifications`: https://docs.novu.co/platform/sdks/react/hooks/use-notifications
11. Courier React SDK: https://www.courier.com/docs/sdk-libraries/courier-react-web and the `@trycourier/courier-js` README (npm)
12. Knock trigger API: https://docs.knock.app/api-reference/workflows/trigger
13. Novu trigger event: https://docs.novu.co/api-reference/events/trigger-event
14. MagicBell API overview: https://www.magicbell.com/docs/api
15. `@suprsend/node-sdk` README (npm, v1.15.1)
16. Knock, identifying recipients: https://docs.knock.app/managing-recipients/identifying-recipients
17. Novu, prepare for production (HMAC): https://docs.novu.co/platform/inbox/prepare-for-production
18. MagicBell user JWT: https://www.magicbell.com/docs/api/authentication/user
19. Courier Inbox authentication: https://www.courier.com/docs/platform/inbox/authentication
20. SuprSend client authentication: https://docs.suprsend.com/docs/client-authentication
21. Courier workspaces and environments: https://courier.com/docs/platform/workspaces/environments-api-keys
22. MagicBell in-app channel: https://www.magicbell.com/docs/channels/in_app
23. SuprSend React in-app feed: https://github.com/suprsend/suprsend-react-sdk/blob/main/docs/in-app-feed.md and https://docs.suprsend.com/docs/inbox-react
24. Knock React feed: https://docs.knock.app/in-app-ui/react/feed
25. MagicBell notification primitive: https://www.magicbell.com/docs/primitive/notification
26. Knock, testing workflows: https://docs.knock.app/send-notifications/testing-workflows
27. Novu self-hosting with Docker: https://docs.novu.co/community/self-hosting-novu/deploy-with-docker

npm facts (versions, `peerDependencies`, `dependencies`, deprecation notices) come from `npm view <pkg>` and package tarballs, run on 2026-11-09.
