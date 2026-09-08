# Codex Multi-Agent Engineering Policy

## Authority

For non-trivial engineering work in this repository, the root Codex agent is explicitly authorized to use subagents, delegation, and parallel agent work.

The root agent remains accountable for architecture, integration, verification, and the final answer. Subagent output is evidence, not authority.

## Model routing

Use the cheapest model that can reliably perform the work:

- `scout` / GPT-5.6 Luna:
  repository exploration, symbol discovery, dependency tracing, simple research, low-risk verification.
- `builder` / GPT-5.6 Terra:
  normal implementation, bounded refactors, routine debugging, test creation.
- `tester` / GPT-5.6 Luna:
  test execution, build verification, lint/typecheck, reproduction and triage.
- `reviewer` / GPT-5.6 Sol:
  difficult reasoning, architecture, security-sensitive review, concurrency review, final adversarial inspection.
- Root / GPT-5.6 Sol:
  requirement interpretation, task graph, architectural decisions, conflict resolution, integration, and final judgment.

Do not use Sol for work that Luna or Terra can handle reliably.

## Standard workflow

For a non-trivial feature or bug:

1. Parse the request and define success criteria.
2. Inspect the repository yourself enough to understand the task boundary.
3. Use `scout` when repository discovery can be delegated efficiently.
4. Produce a dependency-aware task graph.
5. Identify independent workstreams.
6. Assign each write-capable worker a non-overlapping file/symbol ownership boundary.
7. Run independent tasks in parallel when that reduces wall-clock time.
8. Wait for worker results and inspect their diffs; never blindly accept them.
9. Resolve integration issues in the root thread or via one clearly-owned builder task.
10. Use `tester` for independent verification.
11. Use `reviewer` for meaningful changes, high-risk changes, or when correctness is uncertain.
12. Fix material findings.
13. Run final root-level verification.
14. Return one consolidated result to the user.

## Parallelism rules

Good parallelism:
- backend API vs independent frontend component
- implementation vs documentation
- multiple independent test/failure investigations
- separate modules with no shared write ownership

Bad parallelism:
- two agents editing the same file
- two agents redesigning the same API
- simultaneous migrations that depend on one another
- parallel work before shared interfaces are defined

If ownership overlaps, serialize the work.

## Delegation contract

Every delegated task must be self-contained and state:

- objective
- relevant files / symbols
- explicit ownership boundary
- constraints
- expected output
- verification criteria

Do not rely on a child agent to infer missing project context.

## Context policy

Prefer fresh, bounded subagent context for specialist work. Give workers the task-specific facts they need instead of dumping the entire root conversation into every child.

## Safety and quality gates

- Never expose or commit secrets.
- Never bypass tests by weakening assertions without justification.
- Never make destructive repository changes unless the user explicitly requested them.
- Preserve user changes outside the assigned task.
- Distinguish pre-existing failures from regressions.
- For risky migrations or destructive operations, stop at the approval boundary when appropriate.

## Final response contract

The root agent should summarize:

- what changed
- important files
- tests / verification performed
- reviewer findings and resolutions
- remaining known limitations

Do not dump every subagent transcript into the final response.
