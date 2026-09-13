# Delivery rules

1. The primary lifecycle is GitHub Issue, CarryCtx task, branch/worktree,
   commit, pull request, independent review plus CI, merge, then Issue closure
   and final CarryCtx checkpoint/task completion.
2. Link the GitHub Issue and CarryCtx task. Map repository ownership to a team,
   prerequisite order to dependencies, intended edits to scopes, active work to
   a named session and progress, recoverable milestones to checkpoints, and
   ownership transfer to a handoff.
3. Start only accepted, dependency-ready work. Record material decisions,
   blockers, risks, verification, and remaining gaps while the work is active.
4. After the first repository commit, use a dedicated branch and worktree for
   parallel implementation or substantial documentation work. Keep commits
   coherent, scoped, reviewable, and linked to the Issue and task.
5. Before the first commit, normal branches, worktrees, commits, and pull
   requests are unavailable. The commander may use a shared checkout only with
   explicit disjoint scopes, preserved unrelated changes, and CI-equivalent
   local gates. This initialization exception ends after the first commit.
6. A pull request must state the user/contract outcome, affected docs, security
   impact, validation evidence, dependencies, and any follow-up that prevents
   completion. Link cross-repository pull requests and their merge order.
7. Review is independent from implementation. The reviewer inspects the diff,
   authoritative contract, synchronized documentation, edge cases, and
   reproducible CI evidence before acceptance.
8. Documentation synchronization is part of definition of done. A behavior,
   interface, architecture, security, operations, compatibility, deprecation,
   or release change remains incomplete while its canonical docs are stale.
9. Merge only after required review findings and CI failures are resolved. Do
   not treat a task self-report or partial check as acceptance evidence.
10. After merge, close the Issue, record merged revision and final evidence in
    a CarryCtx checkpoint, complete the task, and retain explicit follow-up
    tasks for any separately authorized work.
