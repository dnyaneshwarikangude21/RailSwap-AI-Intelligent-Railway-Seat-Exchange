# RailSwap AI Testing Report

Date of latest verification: 28 October 2026

## 1. Purpose

This report records the verification performed on the RailSwap AI prototype. It covers backend integration tests, frontend component and utility tests, an API smoke pass, ML artifact checks, and a production frontend build. The goal is to show that the documented behavior is implemented consistently and that authorization, reciprocal matching, privacy, and workflow transitions are exercised.

The test suite verifies an academic application using synthetic data. It does not establish suitability for a live railway environment.

## 2. Test environment

| Item | Value |
|---|---|
| Operating system | Windows 11 |
| Python | 3.14.3 |
| Virtual environment | `.venv` |
| Backend test runner | pytest 9.2.0 |
| Flask | 3.x |
| SQLAlchemy | 2.x |
| scikit-learn | 1.9.1 |
| pandas | 2.3.3 |
| NumPy | 2.5.4 |
| Node.js | v24.14.0 |
| npm | 11.9.0 |
| Vite | 6.4.5 |
| Vitest | 3.2.7 |
| Frontend test DOM | jsdom |

## 3. Commands

Run from the project root:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
npm --prefix frontend/frontend test
npm --prefix frontend/frontend run build
```

Combined shortcut:

```powershell
npm test
```

## 4. Test isolation

### Backend

`backend/tests/conftest.py` provides:

- a temporary SQLite database per test application;
- test-specific JWT and Flask secrets;
- missing model and metrics paths by default, forcing a known fallback state;
- reset of the global ML service cache before and after each test;
- artifact paths for tests that explicitly need the trained model.

This prevents the development database or real artifacts from making tests pass accidentally.

### Frontend

`frontend/frontend/src/tests/setup.js` loads Testing Library jest-dom matchers. Vitest uses jsdom with CSS disabled for tests. Component tests use synthetic match objects and controlled callbacks.

## 5. Latest results summary

| Suite | Result | Duration | Warnings |
|---|---|---|---|
| Backend pytest | **30 passed, 0 failed** | 44.81 s | None |
| Frontend Vitest | **5 passed, 0 failed** | 208 ms test execution; 2.35 s total | None |
| API smoke | **17/17 checks passed** | Test-client run | None |
| Production build | **Succeeded** | 7.08 s | Main JS chunk > 500 kB |
| ML artifact load | Passed | Included in backend suite | None |

No skipped tests were reported in the latest backend run because the trained model artifact was present and loadable.

## 6. Backend coverage

The backend suite contains 30 tests in five modules.

### 6.1 Authentication: 7 tests

File: `backend/tests/test_auth.py`

| Test | Verified behavior |
|---|---|
| Registration success | `201`, JWT returned, role `user`, no password hash exposed, hashed password verifies |
| Duplicate registration | `409 EMAIL_IN_USE` |
| Registration validation | Field validation, `400`, and non-JSON `415` |
| Login | Successful credentials and wrong-password rejection with `401 INVALID_CREDENTIALS` |
| Protected route | Missing token returns `401 AUTH_REQUIRED` |
| Profile update | Display name, privacy flag, current-password check, and password rehash |
| Admin login | Role is returned as `admin` from a seeded admin account |

### 6.2 Authorization and ownership: 6 tests

File: `backend/tests/test_permissions.py`

- Booking reads, updates, and deletes require ownership.
- Preference access requires ownership.
- Admin routes reject ordinary users.
- Admin cannot use a private booking endpoint to bypass ownership.
- Admin exchange data is redacted.
- Notification read access requires ownership.
- Unknown exchange IDs return not found.

These tests verify object-level authorization rather than only checking for a valid JWT.

### 6.3 Reciprocal matching: 6 tests

File: `backend/tests/test_matching.py`

- Only reciprocal, hard-eligible candidates are returned.
- Results are ranked in deterministic score order.
- Candidate identity and booking reference privacy are preserved.
- Active exchange requests block both matching and candidate access.
- A preference is required before search.
- Authentication is required.

The deterministic ranking test checks that equal scores use lower candidate booking ID as the documented tie-break.

### 6.4 Exchange workflow: 7 tests

File: `backend/tests/test_exchanges.py`

- Create and accept a request without claiming an official railway change.
- Decline a request and create a new request after a terminal state.
- Reject self-exchange and duplicate active requests.
- Restrict accept/decline to the intended recipient.
- Allow either participant to cancel.
- Reject a requester booking that the actor does not own.
- Enforce the administrator's simulated authorization transitions.
- Verify that JSON export contains no private identity, references, or ticket data.

### 6.5 ML and fallback: 4 tests

File: `backend/tests/test_ml.py`

- Synthetic dataset generation is deterministic and grouped by scenario.
- Feature values lie in the expected unit interval and both target classes can occur.
- Missing model artifacts produce a safe `rule_based_fallback`.
- The trained artifact loads, uses the expected feature schema, and returns a valid probability.
- The service does not train during an inference request.

## 7. Frontend coverage

File: `frontend/frontend/src/tests/matching.test.jsx`

| Test | Verified behavior |
|---|---|
| Match card | Both berth directions, public name, score, ML badge, and review callback |
| Score breakdown | Score, factor labels, contribution values, and accessible progressbar |
| Preference validation | Supported berth and coach-scope values; invalid values rejected |
| Login/registration validation | Email format, required password, display-name length, password length, matching confirmation |
| Formatting | Score, missing score, berth labels, status labels/tones, score tiers |

The suite has five test cases covering the most presentation-sensitive matching logic and shared form validation.

## 8. API smoke verification

A test-client smoke pass used the populated synthetic database and exercised 17 checks:

- health;
- passenger login;
- current profile;
- train list;
- journey list;
- booking list;
- passenger dashboard;
- exchange list;
- notification list;
- ML metrics;
- non-sensitive exchange export;
- administrator login;
- admin overview;
- redacted admin exchange list;
- second passenger login;
- booking list for the second passenger;
- reciprocal match search.

Result: **17/17 passed**.

Observed smoke details:

- Export response was valid JSON and downloadable (`1028` bytes for the seeded state).
- Rohan's reciprocal search returned one candidate.
- The candidate scored `96.88` under the deterministic baseline.
- The ML synthetic-compatibility confidence was `0.9278`.
- Aarav's bookings are intentionally excluded from matching because each is already in an active seeded exchange.

The smoke pass verifies integration wiring and response status. It is not a substitute for browser end-to-end automation.

## 9. Production build

Command:

```powershell
npm --prefix frontend/frontend run build
```

Result:

| Artifact | Size | Gzip |
|---|---:|---:|
| `dist/index.html` | 0.62 kB | 0.38 kB |
| `dist/assets/index-*.css` | 112.24 kB | 21.51 kB |
| `dist/assets/index-*.js` | 721.40 kB | 202.21 kB |

- 2,242 modules transformed.
- Build completed in 7.08 s.
- Vite emitted a non-fatal warning that the main JS chunk exceeds 500 kB.
- No compilation or route-resolution errors occurred.

The chunk warning is an optimization opportunity, not a functional failure. Future work can lazy-load the administrator and ML analytics pages and split charting libraries.

## 10. ML evaluation verification

The saved evaluation report was present and loadable. Actual reported values:

| Metric | ML model | Rule baseline |
|---|---:|---:|
| Accuracy | 1.0000 | 1.0000 |
| Precision | 1.0000 | 1.0000 |
| Recall | 1.0000 | 1.0000 |
| F1 | 1.0000 | 1.0000 |
| Precision@5 | 0.8289 | 0.7267 |

| Dataset/latency item | Value |
|---|---:|
| Total pairs | 4,320 |
| Positive rate | 36.81% |
| Test rows / groups | 1,080 / 90 |
| Mean inference | 34.7123 ms |
| Median inference | 33.7868 ms |
| p95 inference | 42.9930 ms |

Interpretation: because labels are derived from the same documented hard-rule policy, perfect classification metrics are expected. They measure implementation consistency, not real passenger acceptance. Precision@5 is the more informative ranking comparison on this synthetic setup.

## 11. Acceptance criteria

| Criterion | Status |
|---|---|
| Users can register, sign in, and access only their own protected resources | Pass |
| Public/candidate payloads do not expose private identity or references | Pass |
| Reciprocal eligibility requires mutual preference and all hard rules | Pass |
| Active exchanges prevent conflicting matches and requests | Pass |
| Ranking is deterministic and explained | Pass |
| Workflow transitions reject invalid states | Pass |
| Only administrators can advance simulated authorization | Pass |
| Admin responses redact passenger data | Pass |
| Missing ML artifacts do not break matching | Pass |
| The persisted model can be loaded without request-time training | Pass |
| Backend tests pass cleanly | Pass |
| Frontend tests pass cleanly | Pass |
| Frontend production build succeeds | Pass |
| Browser visual/accessibility regression automation | Not implemented |

## 12. Known gaps and limitations

- No Playwright/Cypress browser end-to-end suite has been implemented.
- No automated screenshot, visual-regression, or full accessibility audit has been run.
- Responsive behavior is implemented and compiles, but should be manually checked in target browsers before presentation.
- SQLite concurrency and multi-process load behavior have not been tested.
- No performance or soak test exists for large datasets.
- No live railway, identity, payment, or authorization integration exists by design.
- JWT storage in `localStorage` is a demonstration choice, not a production security recommendation.
- ML metrics are based on synthetic, rule-derived labels and cannot support claims about real-world acceptance.

## 13. Reproducibility

To reproduce the results:

```powershell
.\.venv\Scripts\python.exe -m pytest backend\tests -q
npm --prefix frontend/frontend test
npm --prefix frontend/frontend run build
```

To regenerate the ML experiment:

```powershell
.\.venv\Scripts\python.exe -m backend.ml.generate_dataset
.\.venv\Scripts\python.exe -m backend.ml.train_model
.\.venv\Scripts\python.exe -m backend.ml.evaluate_model
```

To reset synthetic demonstration data:

```powershell
.\.venv\Scripts\python.exe -m backend.seed --reset
```
