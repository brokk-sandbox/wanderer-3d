# Playtest Notes

## 2026-05-28
### Scenario
Quick baseline check after bugfix and deployment pass.

- Start menu loads and menu buttons are clickable.
- Game launches with `PointyStick` + `Pants`.
- Basic gather/craft loop is available.

### Keep / remember
- Hold **E** to pick up; release early for quick pickup.
- Use `1/2/3` for action slots.
- Ensure deployed Pages build still runs smoothly in browser.

### Observed issues
- Vite build chunk warning appears if `vite.config.js` warning limit is not set.
- GitHub Actions deprecation noise is suppressed by workflow settings.

### Next test pass
- Confirm combat feel and placement UX after any UI refactor.
