# Maestro E2E flows

Smoke-level E2E for the iOS app, driven via [Maestro](https://maestro.mobile.dev).

These flows are intentionally shallow — they verify the navigation skeleton
and the auth gate, not deep feature behaviour. They run against a real
Expo dev build (`expo run:ios`) or against an EAS preview build, against
a real backend (staging is the recommended target so the seeded fixture
account exists).

## Running locally

```bash
# Install Maestro once: https://maestro.mobile.dev/getting-started/installing-maestro
# Then export fixture creds:
export MAESTRO_T2W_EMAIL=mobile-e2e@taleson2wheels.com
export MAESTRO_T2W_PASSWORD='not-a-real-password-set-this'

# Build & launch the dev client first, then:
cd mobile
maestro test .maestro/flows/login-smoke.yaml
maestro test .maestro/flows/        # all flows
```

## Running in CI

Maestro Cloud:

```bash
eas build --profile preview --platform ios --non-interactive --no-wait
# ...wait for build, download the .ipa, then:
maestro cloud --app build.ipa .maestro/flows/ \
  --env MAESTRO_T2W_EMAIL=$MAESTRO_T2W_EMAIL \
  --env MAESTRO_T2W_PASSWORD=$MAESTRO_T2W_PASSWORD
```

## Flow inventory

| File | What it does |
|---|---|
| `flows/login-smoke.yaml` | Cold-start → login → assert tabs render. |
| `flows/rides-list.yaml`  | Rides tab filters + open a ride. |
| `flows/profile-signout.yaml` | Profile tab → sign out → back to login. |

## Adding flows

- Use `testID` on inputs where possible (`testID="login-email"`, etc.) so
  flows don't break on copy changes.
- Each flow either starts with `launchApp: clearState: true` or
  `runFlow: login-smoke.yaml` so it's independent.
- Keep flows under 10 steps each — anything bigger should be split.
