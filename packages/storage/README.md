# `@ttrpg-cards/storage`

The only module in the workspace that touches browser storage.

- **IndexedDB for card data.** The user's full card set, so it survives a reload.
- **Local preferences for small UI state only**: selected theme, chosen card size, last view.
  Preference storage caps at a few megabytes, is synchronous and stores strings only; the catalog
  alone is far too large for it.

Stored data never leaves the device. Local persistence is expected and correct here, because
transmission is the line this project draws, not persistence.

Handle quota exhaustion explicitly: a large import can hit it, and the app offers a real "clear
stored data" control.

## Boundaries

- No feature or app code touches a storage API directly. ESLint `no-restricted-globals` and
  `no-restricted-properties` enforce that, including the `window.` and `globalThis.` forms.
- This package is the sole exemption from the storage ban, and **only** the storage ban. The
  transmission ban still applies here in full, restated in the lint config rather than switched
  off, because a persistence package is a plausible place to reach for a network call.
- Reached through a `features/*` slice. `apps/web` may not import it directly.
