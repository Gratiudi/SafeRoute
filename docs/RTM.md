# Requirements Traceability Matrix (RTM)

This matrix maps functional requirements and use cases from the SafeRoute PDF
to the current codebase.

Status values:
- Implemented
- Partial
- Missing

## User Management and Profile
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-UM-01 | User registration with email/phone | `backend/index.js`, `frontend/app/(auth)/register.tsx`, `frontend/lib/auth.tsx` | Implemented |
| FR-UM-02 | User login/authentication | `backend/index.js`, `frontend/app/(auth)/login.tsx`, `frontend/lib/auth.tsx` | Implemented |
| FR-UM-03 | View/update profile | `backend/index.js`, `frontend/app/(tabs)/profile.tsx` | Implemented |

## Emergency Contacts
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-EC-01 | Add/view/remove emergency contacts | `backend/index.js`, `frontend/app/(tabs)/contacts.tsx` | Implemented |
| FR-EC-02 | Edit emergency contacts | `backend/index.js`, `frontend/app/(tabs)/contacts.tsx` | Implemented |

## Safe Route and Navigation
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-SR-01 | Destination input (text search) | `frontend/app/(tabs)/explore.tsx` | Implemented |
| FR-SR-02 | Route calculation via mapping API | `backend/index.js` | Partial |
| FR-SR-03 | Safety scoring algorithm across routes | `backend/index.js` | Partial |
| FR-SR-04 | Show safest route and metrics | `frontend/app/(tabs)/explore.tsx` | Implemented |
| FR-SR-05 | Map visualization of routes | `frontend/app/(tabs)/explore.tsx` | Partial |

## Emergency SOS and Medium Alert
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-SOS-01 | One-tap SOS activation | `backend/index.js`, `frontend/app/(tabs)/index.tsx` | Implemented |
| FR-SOS-02 | Medium alert with auto-escalation | `backend/index.js`, `frontend/app/(tabs)/index.tsx` | Implemented |
| FR-SOS-03 | SMS alert with live location link | `backend/index.js` | Partial |
| FR-SOS-04 | Auto evidence capture (photo + audio) | Not implemented | Missing |

## Evidence and History
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-EV-01 | Store evidence metadata | `backend/index.js` | Implemented |
| FR-EV-02 | Evidence history listing UI | Not implemented | Missing |
| FR-EV-03 | Download/access evidence | Not implemented | Missing |

## Location Sharing
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-LS-01 | Start/stop sharing | `backend/index.js` | Implemented |
| FR-LS-02 | Real-time location updates | `backend/index.js` | Partial |
| FR-LS-03 | Sharing UI wired to backend | `frontend/app/(tabs)/share.tsx` | Missing |

## Ratings and Community Safety
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-RT-01 | Post-trip rating submission | `backend/index.js` | Partial |
| FR-RT-02 | Aggregate safety score | `backend/index.js` | Implemented |

## Notifications
| ID | Requirement | Code Location | Status |
| --- | --- | --- | --- |
| FR-NT-01 | Emergency alerts to contacts | `backend/index.js` | Partial |
| FR-NT-02 | Push notifications | Not implemented | Missing |
