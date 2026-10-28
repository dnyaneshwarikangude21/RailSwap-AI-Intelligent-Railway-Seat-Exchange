# RailSwap AI User Guide

## 1. What the application does

RailSwap AI helps a passenger with a synthetic railway booking:

1. discover reciprocal berth preferences;
2. see why a candidate pair is eligible;
3. send a consent-based exchange request;
4. respond to incoming requests;
5. follow the application-level state history;
6. receive notifications.

It is a demonstration. No real ticket, PNR, seat, reservation, or railway authorization is used or changed.

> An accepted request means two application users agreed. It is **not** an official railway authorization, and the administrator's authorization step is simulated.

## 2. Before you start

Requirements:

- Python 3.11 or newer, preferably 3.14;
- Node.js 20 or newer and npm.

From the project root, install the dependencies and seed synthetic data:

```text
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
copy .env.example .env
.venv\Scripts\python.exe -m backend.seed --reset
npm --prefix frontend/frontend install
```

The commands above use the Windows virtual-environment layout. On macOS/Linux, use `.venv/bin/python` and `cp` instead.

Start the backend in one terminal:

```text
.venv\Scripts\python.exe -m backend.app
```

Start the frontend in a second terminal:

```text
npm --prefix frontend/frontend run dev
```

Open <http://localhost:5173>. The API health page is <http://127.0.0.1:5000/api/health>. Press `Ctrl+C` in each terminal to stop the servers.

## 3. Demo accounts

| Role | Email | Password | Notes |
|---|---|---|---|
| Admin | `admin@railswap.demo` | `Admin@12345` | Redacted operational console |
| Passenger | `aarav@railswap.demo` | `Demo@1234` | Both bookings are already in active demo exchanges |
| Passenger | `priya@railswap.demo` | `Demo@1234` | Seed recipient and accepted participant |
| Passenger | `rohan@railswap.demo` | `Demo@1234` | Best starting point for a live match |
| Passenger | `ananya@railswap.demo` | `Demo@1234` | Reciprocal candidate for Rohan |
| Passenger | `vikram@railswap.demo` | `Demo@1234` | Has a declined seeded request |
| Passenger | `meera@railswap.demo` | `Demo@1234` | Display name sharing is disabled |

All accounts and records are synthetic.

## 4. First tour

After signing in as **Rohan Demo**, the sidebar provides:

| Page | Purpose |
|---|---|
| Dashboard | Bookings, active requests, match counts, recent activity |
| Trains | Synthetic train and journey discovery |
| My Bookings | Bookings owned by the current user |
| Find Matches | Reciprocal search and score explanation |
| Preferences | Berth and coach-scope preferences |
| Exchange Requests | Incoming/outgoing requests and actions |
| Notifications | Exchange notifications and read state |
| Profile & Privacy | Display name, sharing, and password |
| ML Lab | Actual synthetic-label evaluation and model status |
| Administrator Console | Admin-only aggregate and redacted views |

The footer and page notices repeat the synthetic, non-official status.

## 5. Guided scenario: complete a reciprocal exchange

### Step 1: Find a match as Rohan

1. Sign in as `rohan@railswap.demo` / `Demo@1234`.
2. Open **Find Matches**.
3. Select Rohan's booking on the Aurora Coastal Express.
4. Start the search.

Expected result on the seeded database: one reciprocal candidate associated with Ananya. In the verified smoke run, the deterministic score was `96.88` and the experimental ML confidence was `0.9278`.

Why the pair qualifies:

- both bookings are on the same synthetic journey and coach S1;
- Rohan currently has a `MIDDLE` berth and prefers `SIDE_LOWER`;
- Ananya currently has a `SIDE_LOWER` berth and prefers `MIDDLE`;
- both coach scopes allow the pairing;
- neither booking is in an active exchange.

### Step 2: Inspect the explanation

Open **Review match**. Check:

- both directions of the preference;
- the score contributions;
- hard-rule checks;
- ML status and caveat;
- the notice that this is not an official railway change.

The ML value is supporting information only. It cannot make an ineligible pair eligible or override the deterministic rank.

### Step 3: Send the request

Choose **Send consent request**. The request becomes `PENDING`. An application notification is created for the recipient.

This is a consent request between demo users. No berth is reassigned.

### Step 4: Respond as the recipient

1. Sign out and sign in as `ananya@railswap.demo` / `Demo@1234`.
2. Open **Notifications** or **Exchange Requests**.
3. Open the incoming request.
4. Choose **Accept** or **Decline**.

If accepted, the state becomes `ACCEPTED_BY_BOTH`.

If declined, the state becomes `DECLINED` and the request is terminal. The relevant bookings are released from the active-exchange conflict and can be used in a later request, if still eligible.

### Step 5: Observe the simulated authorization gate

1. Sign in as `admin@railswap.demo` / `Admin@12345`.
2. Open **Administrator Console**.
3. Locate the accepted request. Passenger identity is redacted.
4. Start simulated authorization if desired.
5. The state becomes `AWAITING_EXTERNAL_AUTHORIZATION`.
6. Complete the simulation to reach `COMPLETED`.

The administrator button is an explicit simulation. No external system is contacted.

### Step 6: Check history and export

As a participant, reopen the exchange to see its event history. Use **Export** on the exchange page to download `railswap-exchange-summary.json`. The export excludes passenger identity, email, booking reference, and ticket data.

## 6. Understanding matching exclusions

A candidate is not shown when any hard rule fails, including:

- the candidate does not occupy the requester's preferred berth type;
- the requester does not occupy the candidate's preferred berth type;
- the candidate has no preference;
- the pairing violates a coach scope;
- either booking is already in an active request;
- the journey is past;
- the berth records are invalid;
- the candidate is the requester or belongs to the same user.

This is intentional. A high score never compensates for an eligibility failure.

### Why Aarav shows no matches

Aarav has two seeded bookings:

- Aarav J1 is `PENDING` with Priya J1;
- Aarav J2 is `ACCEPTED_BY_BOTH` with Priya J2.

Both Aarav bookings are active participants, so matching correctly excludes them. This demonstrates conflict protection. Use Rohan for the primary matching demonstration.

## 7. Preferences and coach scope

Open **Preferences** for an owned booking.

| Field | Meaning |
|---|---|
| Desired berth type | Lower, Middle, Upper, Side Lower, or Side Upper |
| Coach scope | `ANY` allows cross-coach matches; `SAME_COACH` requires both bookings in the same coach |

A reciprocal match requires both passengers' preferences to point at each other's current berth type. A one-sided preference is not enough.

If a booking is in an active exchange, preference updates are rejected until the request is resolved.

## 8. Notifications

The bell and **Notifications** page show application events such as:

- a new request;
- acceptance or decline;
- cancellation;
- simulated authorization pending;
- simulated completion;
- expiry.

Unread counts are per user. You can mark one notification or all notifications read. Notifications are stored in the local database.

## 9. Privacy controls

Open **Profile & Privacy**.

- Change the display name.
- Turn **Share display name** off. Other passengers then see `Demo passenger` in candidate and exchange summaries, while your own profile still shows the real name.
- Change the password by supplying the current password and a new password of at least eight characters.

The administrator's exchange view is always redacted regardless of this setting.

## 10. Administrator console

The administrator console shows:

- aggregate counts for users, trains, journeys, bookings, requests, notifications, and active exchanges;
- exchange counts by state;
- redacted exchange summaries;
- current ML artifact/fallback status;
- allowed simulated state actions.

Administrators cannot open another passenger's private booking endpoint and cannot see passenger names, emails, booking references, or ticket data in the exchange list.

## 11. ML Lab

The ML Lab reads the saved evaluation report. It shows:

- model availability and mode;
- dataset size and test grouping;
- model versus rule-baseline classification metrics;
- Precision@5;
- feature importance;
- confusion matrices;
- inference latency;
- explicit caveats.

The reported scores are high because the synthetic target is derived from the same documented eligibility rules. This validates implementation consistency, not real-world behavior.

If the model artifact is missing, the application reports a rule-based fallback and matching continues normally.

## 12. Exporting a summary

The participant exchange page can export a JSON summary. The export includes exchange state, score, role, route, train, and timestamps. It excludes:

- passenger names;
- email addresses;
- demo booking references;
- ticket or reservation data.

The export is an application-level demonstration record.

## 13. Resetting the demonstration

To rebuild all synthetic users, trains, journeys, bookings, preferences, exchanges, and notifications:

```text
.venv\Scripts\python.exe -m backend.seed --reset
```

Warning: this drops and recreates local database tables. It does not affect real data because none exists in this project.

To regenerate the ML experiment:

```text
.venv\Scripts\python.exe -m backend.ml.generate_dataset
.venv\Scripts\python.exe -m backend.ml.train_model
.venv\Scripts\python.exe -m backend.ml.evaluate_model
```

## 14. Troubleshooting

### The frontend says it cannot reach the server

- Confirm the API is running on port 5000.
- Open <http://127.0.0.1:5000/api/health>.
- Confirm the Vite proxy configuration has not been changed.
- Restart both processes from the project root after configuration changes.

### Port 5000 or 5173 is already in use

Stop the conflicting process or close the older RailSwap server windows. Start the app again. If the API port changes, update the Vite proxy target.

### Setup reports that Python or Node is unavailable

Install Python 3.11+ and Node.js 20+, then rerun the install commands in section 2.

If Python 3.14 is not available through the `py` launcher, use the `python` command instead.

### Authentication fails

- Check email/password carefully.
- Tokens expire after 12 hours by default; sign in again.
- Reset demo data only if you intend to discard local changes.

### No matches appear

Check all of the following:

- the selected booking has a preference;
- the booking is not in an active exchange;
- another eligible passenger is on the same journey;
- both preferences are reciprocal;
- coach scopes permit the pairing.

Remember that Aarav's seeded bookings are intentionally blocked by active requests.

### The ML Lab reports fallback

The artifact may be absent, incompatible, or unreadable. Run the three ML commands above. Matching still works because the deterministic engine is authoritative.

### The page looks different than expected after a data reset

Sign out and sign in again so the UI reloads the current accounts and seeded state.

## 15. Limitations

- Synthetic data only; no real railway, ticket, identity, or payment integration.
- No official railway authorization is possible.
- No production-grade token revocation, email verification, or MFA.
- SQLite is intended for local demonstration.
- ML metrics do not predict real passenger acceptance.
- Browser visual and accessibility checks should be completed manually before a presentation.
