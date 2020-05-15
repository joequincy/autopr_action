# AutoPR

```diff
- This Action is exploratory and not fully supported at this time.
! To discourage uninformed use, no usage documentation is provided at this time.
! Please feel free to use at your own discretion, but you will need to explore the
! code to understand what you're getting into.
+ Feedback is welcomed and greatly appreciated!
```

This action helps repository maintainers keep track of changes that are waiting to move out to production for any reason (acceptance testing, not yet ready to merge, etc) by opening and maintaining an automatic PR from the HEAD (development) branch to the BASE (production) branch.

This is built to assume a workflow something like below where feature branches are utilized and all merges to the BASE branch are made from the HEAD branch instead of from feature branches... where some features may end up in HEAD simultaneously waiting to be merged to BASE.
```
BASE
  |
  |\
  | \HEAD
  |  |
  |  |\
  |  | \FeatureA
  |  |  |
  |  |  |
  |  | /
  |  |/
  |  |\
  |  | \FeatureB
  |  |  |
  |  |  |
  |  | /
  |  |/
  |  |\
  |  | \FeatureC
  |  |  |
  |  |  |
  |  | /
  |  |/
  | /|
  |/ |
  |  |
  ```


The automatic PR will include a list of all the feature -> BASE PRs that will be captured, including links to those original PRs. It also supports integrations for project boards (Note: only Clubhouse is supported at this time) to link the automatic PR to any relevant stories.