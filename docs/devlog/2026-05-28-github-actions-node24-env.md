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

This suppresses the warning and aligns workflow execution with upcoming runner changes.

## Note
No gameplay code changed; only CI workflow behavior/prep.