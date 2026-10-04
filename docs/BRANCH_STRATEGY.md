# ChurnXAI — Git Branch Strategy

This document defines the branching strategy for the ChurnXAI project.
We follow a modified **Gitflow workflow** with maximum branch clarity.

## Branch Types

| Prefix | Purpose | Merges Into |
|--------|---------|-------------|
| `chore/*` | Setup, config, scaffolding | `develop` |
| `feature/*` | New functionality | `develop` |
| `fix/*` | Bug fixes | `develop` |
| `refactor/*` | Code restructuring | `develop` |
| `test/*` | Test additions | `develop` |
| `docs/*` | Documentation | `develop` |
| `release/*` | Release preparation | `main` + `develop` |

## Branch Lifecycle
