# Changelog

## [v1.3.3](https://github.com/thaim/actions/compare/v1.3.2...v1.3.3) - 2026-04-13
### New Features & Bug Fixes
- fix: show tool output when step has continue-on-error by @thaim in https://github.com/thaim/actions/pull/39

## [v1.3.2](https://github.com/thaim/actions/compare/v1.3.1...v1.3.2) - 2026-04-12
### New Features & Bug Fixes
- fix: update run-npm-dependency-policy SHA to include action by @thaim in https://github.com/thaim/actions/pull/37

## [v1.3.1](https://github.com/thaim/actions/compare/v1.3.0...v1.3.1) - 2026-04-12
### New Features & Bug Fixes
- fix: improve error logging in security workflow by @thaim in https://github.com/thaim/actions/pull/35

## [v1.3.0](https://github.com/thaim/actions/compare/v1.2.0...v1.3.0) - 2026-04-12
### New Features & Bug Fixes
- feat: add dependency policy check workflow by @thaim in https://github.com/thaim/actions/pull/33
### Internal Changes
- chore(deps): update songmu/tagpr action to v1.18.2 by @renovate[bot] in https://github.com/thaim/actions/pull/32

## [v1.2.0](https://github.com/thaim/actions/compare/v1.1.0...v1.2.0) - 2026-04-05
### New Features & Bug Fixes
- fix: avoid broken pipe error in zizmor action on push events by @thaim in https://github.com/thaim/actions/pull/20
- feat: continue running all security checks even when one fails by @thaim in https://github.com/thaim/actions/pull/23
### Internal Changes
- docs: add README by @thaim in https://github.com/thaim/actions/pull/18
- chore: update composite action refs to include zizmor fix by @thaim in https://github.com/thaim/actions/pull/21
- ci: categorize release notes and add auto-labeling workflow by @thaim in https://github.com/thaim/actions/pull/22
- ci: configure renovate to skip pending approval by @thaim in https://github.com/thaim/actions/pull/24
- chore(deps): update actions/checkout action to v6 by @renovate[bot] in https://github.com/thaim/actions/pull/25
- ci: ignore self-referencing dependency in renovate by @thaim in https://github.com/thaim/actions/pull/27
- fix: correct tagpr version comment from v1 to v1.17.1 by @thaim in https://github.com/thaim/actions/pull/28
- chore(deps): update songmu/tagpr action to v1.18.0 by @renovate[bot] in https://github.com/thaim/actions/pull/29

## [v1.1.0](https://github.com/thaim/actions/compare/v1.0.2...v1.1.0) - 2026-04-05
- feat: add reviewdog integration for PR inline comments by @thaim in https://github.com/thaim/actions/pull/15
- refactor: split setup-security-tools into individual actions by @thaim in https://github.com/thaim/actions/pull/17

## [v1.0.2](https://github.com/thaim/actions/compare/v1.0.1...v1.0.2) - 2026-04-05
- ci: add security CI workflow by @thaim in https://github.com/thaim/actions/pull/12
- fix: resolve command not found when calling reusable security workflow by @thaim in https://github.com/thaim/actions/pull/14

## [v1.0.1](https://github.com/thaim/actions/compare/v1.0.0...v1.0.1) - 2026-04-04
- fix: remove major version tag update and resolve ghalint violations by @thaim in https://github.com/thaim/actions/pull/10

## [v1.0.0](https://github.com/thaim/actions/commits/v1.0.0) - 2026-04-04
- chore: improve reusable security workflow by @thaim in https://github.com/thaim/actions/pull/1
- feat: introduce aqua and enhance security checks with ghalint and zizmor by @thaim in https://github.com/thaim/actions/pull/2
- feat: add Renovate configuration for automated dependency updates by @thaim in https://github.com/thaim/actions/pull/3
- chore(deps): update actions/checkout action to v6 by @renovate[bot] in https://github.com/thaim/actions/pull/6
- chore(deps): update aquaproj/aqua-installer action to v4.0.4 by @renovate[bot] in https://github.com/thaim/actions/pull/5
- feat: add tagpr-based release workflow for semantic versioning by @thaim in https://github.com/thaim/actions/pull/8
