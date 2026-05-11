# Skill Registry for notes

**Generated**: 2026-04-29  
**Project**: notes (Multi-platform Desktop App: Tauri v2 + React 19 + .NET 10)  
**Persistence**: Engram  

## Project Stack & Conventions

| Aspect | Technology |
|--------|-----------|
| **Backend** | .NET 10 + C# 14, Clean Architecture |
| **Frontend Desktop** | Tauri v2 + React 19 |
| **Database** | PostgreSQL |
| **Testing Backend** | xUnit, Testcontainers, FluentAssertions |
| **Testing Frontend** | Vitest + React Testing Library + Playwright E2E |
| **Deployment** | VPS + Dokploy + Docker |
| **Architecture Pattern** | Clean Architecture (Domain → Application → Infrastructure → API) |

## Available Skills

### SDD Framework (Change Management)
- **sdd-init** — Initialize SDD context in a project
- **sdd-propose** — Create a change proposal with intent, scope, and approach
- **sdd-spec** — Write specifications with requirements and scenarios
- **sdd-design** — Create technical design document
- **sdd-tasks** — Break down changes into implementation task checklist
- **sdd-apply** — Implement tasks from a change
- **sdd-verify** — Validate that implementation matches specs
- **sdd-archive** — Sync delta specs and archive completed changes
- **sdd-onboard** — Guided walkthrough of full SDD workflow

### Development & Architecture Skills
- **typescript** — TypeScript strict patterns and best practices
- **react-19** — React 19 patterns with React Compiler
- **tailwind-4** — Tailwind CSS 4 patterns
- **frontend-design** — Create distinctive, production-grade frontend interfaces
- **web-design-guidelines** — Review UI for Web Guidelines compliance
- **nestjs-best-practices** — NestJS architecture patterns (N/A for this project)
- **supabase-postgres-best-practices** — Postgres optimization and best practices
- **playwright** — Playwright E2E testing patterns
- **go-testing** — Go testing patterns (N/A for this project)
- **skill-creator** — Create new AI agent skills
- **skill-registry** — Create/update skill registry

### Issue & PR Workflows
- **issue-creation** — Create GitHub issues following issue-first enforcement
- **branch-pr** — Create pull requests following issue-first enforcement
- **judgment-day** — Parallel adversarial review protocol

## Auto-Load Triggers

The following skills **automatically load** based on context:

| Context | Skill | When |
|---------|-------|------|
| Writing React components | **react-19** | Detecting React hooks, state patterns |
| Styling with Tailwind | **tailwind-4** | `className` or Tailwind utility usage |
| Writing TypeScript | **typescript** | Type definitions, interfaces, generics |
| Building UI layouts | **frontend-design** | Web components, dashboards, pages |
| Writing E2E tests | **playwright** | Playwright test files |
| Database queries | **supabase-postgres-best-practices** | SQL, schema optimization |

## How Skills Are Used

1. **SDD Phase**: Run `/sdd-*` commands to progress through Spec-Driven Development
2. **Code Implementation**: Skills auto-load based on file context and language
3. **Architecture Review**: Use `judgment-day` for adversarial code review
4. **UI/UX Review**: Use `web-design-guidelines` for design compliance

## Project-Specific Notes

- **Greenfield project**: No code yet, only PRD. Start with `/sdd-explore` to clarify requirements.
- **Multi-layer testing**: Unit (Domain/Application) → Integration (Infrastructure) → E2E (UI flows)
- **Clean Architecture**: Strict separation required — Domain has zero dependencies
- **Deployment**: GitHub Actions → Docker → Dokploy (auto-deploy on merge to main)

