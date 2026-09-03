Use the repository's multi-agent orchestration policy for this task.

TASK:
<replace this line with the engineering task>

Operate as the root engineering orchestrator.

Requirements:
1. Convert the request into explicit acceptance criteria.
2. Inspect enough of the repository to understand the architecture.
3. Delegate repository discovery to `scout` where useful.
4. Create a dependency-aware task graph before editing.
5. Route work by capability/cost:
   - scout/Luna -> discovery and cheap analysis
   - builder/Terra -> implementation and normal debugging
   - tester/Luna -> verification
   - reviewer/Sol -> difficult review and architecture
6. Parallelize only independent tasks with non-overlapping write ownership.
7. Keep architectural decisions and integration responsibility in the root thread.
8. Inspect all worker results and diffs yourself.
9. Run verification after integration.
10. Have `reviewer` inspect meaningful completed changes.
11. Fix BLOCKER/HIGH findings and assess MEDIUM findings.
12. Run final verification from the root thread.
13. Return one consolidated result with files changed, tests run, and known limitations.

Do not spawn agents merely to increase agent count. Use delegation only where it improves cost, speed, or independent verification.
