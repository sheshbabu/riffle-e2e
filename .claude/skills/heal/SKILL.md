---
name: heal
description: Diagnose and fix the failing or flaky tests from the last stress run in stress.log. Use when the user runs `make heal`, invokes /heal, or asks to heal the suite.
---

# Heal

Fix the tests that failed in the last stress run, and nothing else.
The goal is a suite that tests riffle correctly, not a suite that passes.

## 1. Read the failures

- `stress.log` holds the output of `make stress`. If it is missing or shows no failures, say so and stop.
- List every failed or flaky test with its error.
- For each one, read `test-results/<test>/error-context.md`, which has the error, the page snapshot and the test source.
- Note the pattern: does it fail on every repeat, only after the first, or at random? Failing only on later repeats usually means the shared database grew, not that the test is wrong.

## 2. Classify each failure

- **Test bug**: a race, a selector that matches the wrong element, a dependency on data from other specs, or a wrong assumption about riffle. Fix it.
- **riffle bug**: riffle behaves wrongly. Don't touch ../riffle. Follow the CLAUDE.md convention: keep the assertion, mark the test `test.fail()` with a comment describing the bug, and add it to the findings in `topology.md`.
- **Unclear**: when you can't tell which it is from the evidence, leave the test as it is and report it.

Read the riffle code before deciding that a failure is a riffle bug.

## 3. Rules for fixes

- Only change what the failures need. Don't refactor or restyle passing tests.
- Never remove, weaken or loosen an assertion to make a test pass. That includes swapping an exact match for a partial one, lowering an expected count, or deleting an `expect`.
- Never add `test.skip`, `test.fixme`, retries, or a longer timeout, and don't edit `playwright.config.js`.
- Don't use `test.fail()` for anything but a confirmed riffle bug.
- Wait on a condition (a URL, a response, an element state), not a fixed `waitForTimeout`.
- Follow CLAUDE.md: selectors live in `helpers/ui.js`, setup goes through `helpers/api.js`, and names come from `unique()`.
- A change to a shared helper affects every spec that uses it, so keep helper changes minimal.

## 4. Verify

- Re-run each fixed spec with `npx playwright test <spec> --repeat-each 5`.
- Then run `npx playwright test` once to check that nothing else broke.
- If a fix doesn't hold after two attempts, revert it and report the test as unclear.

## 5. Report

End with a short summary, one entry per failing test:
- the test name and error
- the cause and how you classified it
- what you changed, or why you changed nothing

Then list every file you edited.
