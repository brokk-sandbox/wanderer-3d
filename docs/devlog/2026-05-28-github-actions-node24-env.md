# WANDERER 3D — GitHub Actions Node.js deprecation warning mitigation

## Date
2026-05-28

## Symptom
GitHub Actions emitted warning:
- `Node.js 20 actions are deprecated...` listing built-in actions in Pages workflow.

## Fix
Updated workflow `.github/workflows/deploy-pages.yml` to opt into the runner Node.js 24 runtime for JavaScript actions by adding:

```yaml
env:
  FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true
```

To ensure the setting applies to all jobs/steps, the env variable is now set at workflow scope, job scope (`build`, `deploy`) and deploy step.

This is expected to suppress the warning across both build and deploy actions.

## Note
No gameplay code changed; only CI workflow behavior/prep.