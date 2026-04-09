// e2e/clients/README.md
# Per-client test suites

Each client directory contains tests specific to that client's configuration.
These tests run against their live provisioned environment.

## Adding a new client

1. Create a directory: `e2e/clients/<client-slug>/`
2. Copy `_template/` into it
3. Edit `config.js` with their credentials and custom fields
4. Add their project to `playwright.config.js`

## Running client tests

```bash
# All client tests
npx playwright test --project=client-acme

# Specific client + specific spec
npx playwright test e2e/clients/acme-corp/portal.spec.js

# Headed (watch the browser)
npx playwright test --project=client-acme --headed
```

## What to test per client

- ✅ Login with their admin credentials
- ✅ Their custom fields exist and are editable
- ✅ Their workflows advance correctly
- ✅ Their portal shows the right jobs
- ✅ Their user roles restrict the right things
- ✅ Their approval chains work end-to-end
