# Church Google Voice Email Routing & Multi-Account Sign-In

Enable direct routing to the ministry Google Voice email for all SMS and broadcast features via Google `authuser` parameters, and support seamless Google authentication for both the builder and church Google accounts.

> [!IMPORTANT]
> **User Review & Confirmed Decisions**
> - **Confirmed Decision 1 (Google Voice Routing)**: Use the church email address with Google's `authuser` parameter (`&authuser=church@gmail.com`) so that when team members click "Send via Google Voice", "Mass Broadcast", or "Call", Google Voice automatically opens in the church's Google account rather than the builder's personal account.
> - **Confirmed Decision 2 (Sign-In Access)**: Support both builder and church accounts signing in to the web application. Provide an in-app "Google Cloud Test Users & Access Setup" guide explaining how to add the church email in Google Cloud Console OAuth consent screen (to remove the 403 test user restriction), plus an explicit "Switch Google Account" trigger in the header.

---

### 1. Overview & Core Concept

Currently, when users click Google Voice outreach actions, the browser opens `https://voice.google.com/u/0/messages?query=...`, which defaults to Google account slot `0` (the personal/builder account). Furthermore, the Google OAuth client is in developer testing mode, which prevents other accounts (like the church email) from signing into the web app unless listed as authorized test users.

This solution provides two key enhancements:
1. **Dedicated Church Google Voice Routing**: A configurable Google Voice account setting where the user specifies the church email (e.g. `ministry@church.org`). All outgoing Google Voice links (welcome messages, call dispatcher, single SMS, batch broadcasts) automatically append `authuser=<churchEmail>`, activating the church Google Voice session without requiring the builder to sign out of their personal Google session.
2. **Multi-Account App Sign-In & Onboarding**: An explicit account switcher in the header allowing users to sign in with either the builder or church Google account, paired with an interactive diagnostic modal that explains how to add the church email to Google Cloud Test Users in seconds.

---

### 2. User Experience & Visual Design

#### Key User Flows
1. **Configuring the Church Google Voice Email**:
   - The user opens the **Google Voice & SMS Settings** modal.
   - A dedicated section **"Google Voice Account & Email Routing"** lets them enter the church email (e.g., `harvestchurch@gmail.com`) and choose between `authuser` email routing or account slot index.
   - A live **"Verify Church Google Voice Link"** button opens a test tab directly in the church Google Voice profile to confirm it switches to the right account immediately.
2. **Broadcasting & Welcoming with Church Account**:
   - In **Broadcast Center**, **Welcome Manager**, **Member Modal**, and **Call Dispatcher**, when clicking "Send via Google Voice", the generated URL carries `authuser=<churchEmail>`.
   - The user sees a clear badge in the dispatcher: *"Opening with Church Voice: harvestchurch@gmail.com"*.
3. **Signing in with the Church Account**:
   - In the top navigation header, clicking the account dropdown provides **"Switch Google Account"** or **"Sign In with Ministry Account"** which invokes `select_account`.
   - If a church staff member encounters Google OAuth error 403 ("access_denied / developer testing"), a helpful **"Authorize Church Email (OAuth Guide)"** modal provides one-click instructions to add the email to Google Cloud Console Test Users.

#### Visual Identity & Theme
- **Color Palette**: Deep slate background (`#0F172A`), warm amber accents (`#D97706` / `#B45309`), emerald status accents (`#059669`), and clean white structural cards.
- **Typography & Hierarchy**: Clean typographic hierarchy using `Plus Jakarta Sans` for titles and `JetBrains Mono` / `tabular-nums` for phone numbers and Google account parameters.
- **Zero-Pill Discipline**: Status labels and account indicators rendered with clean unboxed text and typographic bullet separators (`·`).

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: URL Parameter `authuser` vs Account Slot `/u/1/`**:
  - *Chosen Approach*: Support both, defaulting to `authuser=<churchEmail>`.
  - *Why*: Google account index slots (`/u/0/`, `/u/1/`, `/u/2/`) vary depending on which account was signed in first on any given computer. Passing `authuser=church@gmail.com` directs Google to the exact matching Google profile regardless of slot order, while still allowing slot fallback.
- **Decision 2: Dual-Account Decoupling**:
  - *Chosen Approach*: Allow Google Voice outreach to use the church email even if the web app was signed in by the builder.
  - *Why*: Church administrators often have different roles: the tech lead or pastor may connect the Google Sheet with their account, while broadcasts must originate from the ministry's Google Voice line. Decoupling ensures zero friction.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────┐
│                   MinistryPulse App                    │
└────────────────────────────────────────────────────────┘
          │                                 │
          ▼                                 ▼
┌───────────────────────────┐    ┌──────────────────────────────────┐
│   Google Workspace Auth   │    │     SmsGatewayConfig & State     │
│   - Builder or Church     │    │   - googleVoiceNumber            │
│   - select_account prompt │    │   - googleVoiceEmail (Church)    │
│   - Test Users Guidance   │    │   - googleVoiceSlot (fallback)   │
└───────────────────────────┘    └──────────────────────────────────┘
                                                    │
                                                    ▼
                                 ┌──────────────────────────────────┐
                                 │     Communications Service       │
                                 │  getGoogleVoiceMessageUrl()      │
                                 │  getGoogleVoiceCallUrl()         │
                                 │  -> voice.google.com/messages    │
                                 │     ?query=...&authuser=<email>  │
                                 └──────────────────────────────────┘
                                                    │
                   ┌────────────────────────────────┴───────────────────────────────┐
                   ▼                                                                ▼
    ┌───────────────────────────────┐                             ┌───────────────────────────────────┐
    │     Broadcast Center &        │                             │    Call Dispatcher & Member       │
    │  BatchBroadcastRunnerModal    │                             │         Outreach Modals           │
    │  - Opens church voice in tab  │                             │   - 1-click church voice links    │
    │  - Pre-copies personalized msg│                             │   - Account indicator in UI       │
    └───────────────────────────────┘                             └───────────────────────────────────┘
```

#### Proposed File Changes
- `src/types.ts` & `src/services/communications.ts`:
  - Extend `SmsGatewayConfig` with `googleVoiceEmail?: string` and `googleVoiceSlot?: number`.
  - Update `getGoogleVoiceMessageUrl` and `getGoogleVoiceCallUrl` to support the church email and `authuser` query param.
- `src/components/GoogleVoiceSetupModal.tsx`:
  - Add church email input with live test verification and slot options.
  - Add clear step-by-step guidance on church Google Voice setup.
- `src/components/Header.tsx` & `src/services/auth.ts`:
  - Enhance account menu with "Switch Google Account" and "Authorize Team / Church Email" modal.
- `src/components/OAuthHelpModal.tsx` (new component):
  - In-app visual guide explaining Google Cloud Test Users whitelist steps for the church email.
- `src/components/BatchBroadcastRunnerModal.tsx` & `src/components/CallDispatcherModal.tsx`:
  - Display the active church Google Voice sender email in the runner.
