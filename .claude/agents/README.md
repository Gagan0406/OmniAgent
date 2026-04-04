# Agents — Omni Copilot

This directory contains specialized subagents for the Omni Copilot project.

## Available Agents

| Agent | Model | Trigger |
|-------|-------|---------|
| `sop` | Sonnet | Pre-PR checks, release prep, convention enforcement |
| `task-manager` | Sonnet | Feature planning, task breakdown, work organization |
| `researcher` | Sonnet | Codebase exploration, dependency investigation, pattern finding |
| `code-reviewer` | Sonnet | Code review, pre-PR quality checks, security review |
| `system-architect` | Opus | Architecture decisions, design trade-offs, ADRs, multi-tenancy design |
| `integration-tester` | Sonnet | End-to-end integration testing, multi-service flow verification |

## Usage
Agents are triggered automatically when Claude determines the task matches
the agent's description, or you can invoke them explicitly:

- "Use the researcher to explore how the Gmail tool is wired"
- "Have the task-manager plan the Discord integration"
- "Ask the system-architect about adding a caching layer for Composio responses"
- "Run the integration-tester on the new Notion tool"
- "Use the code-reviewer to check my current changes"
- "Run the SOP agent before I open a PR"

## Adding New Agents
Create a `.md` file in this directory with YAML frontmatter:
```yaml
---
name: agent-name
description: "When to trigger this agent — be specific"
model: sonnet | opus | haiku
---
(System prompt with responsibilities, rules, and output format)
```

## Tips
- Use Sonnet for most agents — it's fast and capable enough for focused tasks
- Reserve Opus for the system-architect where deep reasoning matters
- Keep agent prompts focused — a 50-line prompt beats a 200-line one
- Include project-specific context (file paths, conventions) in each agent
