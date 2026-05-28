# Getting Started (User Notes)

Use this file whenever you want to capture reusable instructions I should remember later.

## How to use this
- Add entries in plain language.
- Keep each section short (1-3 bullets or 2-4 sentences).
- Tag notes if useful, e.g. `#play`, `#fix`, `#remember`, `#workflow`.

## Note format

```markdown
## YYYY-MM-DD
### Context
What prompted this note.

### What I want remembered
- Point 1
- Point 2

### Desired outcome
What should happen next / what success looks like.

### References
- Files, commands, URLs, commits
```

## Example

### 2026-05-28
### Context
Need to keep UI/menu interaction stable while refactors continue.

### What I want remembered
- Keep `src/game/game.js` logic grouped by system only after a smoke-test pass.
- Never remove `bindMenuButtons()` or direct click fallbacks until validated.

### Desired outcome
Menu should always respond on click and Enter/tap in browser tests.

### References
- `src/game/game.js`
- Commit: `b63a7e2`
