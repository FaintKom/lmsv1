/**
 * Quarantine list - tests known to be flaky.
 *
 * Tests whose title contains `@quarantine` are still run (so they don't
 * silently bit-rot) but their failures do not block the PR. Goal: keep
 * this empty at release time.
 *
 * When adding an entry, file a GitHub issue and reference it in the
 * inline comment so the trail is recoverable. Remove the entry once the
 * test passes 10 consecutive runs.
 */
export const QUARANTINED_TEST_TITLES: readonly string[] = [
  // Example (remove once empty):
  // "exercise lifecycle: scorm_package @quarantine - flaky due to upload race, see #NNN",
];
