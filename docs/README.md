# Task Sentinel Documentation

**Version:** 2.0.0 (Phase 2)
**Last Updated:** 2025-10-30

---

## Documentation Overview

Complete documentation for Task Sentinel's autonomous task execution system with GOAP planning and OODA loop monitoring.

---

## Quick Links

### Getting Started
- **[Usage Guide](usage_guide.md)** - Complete user guide with examples and workflows
- **[Phase 2 Guide](phase2_guide.md)** - Advanced GOAP + OODA features

### API References
- **[GOAP API](api/goap.md)** - Goal-Oriented Action Planning module
- **[OODA API](api/ooda.md)** - Observe-Orient-Decide-Act loop module
- **[Metrics API](api/metrics.md)** - Performance metrics and monitoring

### Project Documentation
- **[Main README](../README.md)** - Project overview and quick start
- **[CLAUDE.md](../CLAUDE.md)** - Claude Code configuration

---

## Document Structure

```
docs/
├── README.md                    # This file
├── usage_guide.md              # Complete usage guide
├── phase2_guide.md             # Phase 2 features guide
└── api/
    ├── goap.md                 # GOAP API reference
    ├── ooda.md                 # OODA API reference
    └── metrics.md              # Metrics API reference
```

---

## What's in Each Document

### [Usage Guide](usage_guide.md)
**Complete user documentation covering:**
- Installation and setup
- Quick start tutorial
- Command reference (`/task-create`, `/task-claim`, `/task-status`, etc.)
- Workflow patterns (single task, parallel, complex features)
- OODA loop explained
- GOAP planning basics
- Agent coordination
- Troubleshooting
- Advanced features
- Phase 2 integration
- Best practices

**Audience:** All users
**Length:** ~3,300 lines
**Includes:** Commands, examples, workflows, troubleshooting

---

### [Phase 2 Guide](phase2_guide.md)
**Advanced GOAP + OODA features:**
- Phase 2 overview and architecture
- GOAP state model explained
- A* planning algorithm details
- OODA loop monitoring (Observe, Orient, Decide, Act)
- Adaptive replanning mechanisms
- Performance metrics and KPIs
- Configuration options
- Troubleshooting Phase 2 issues
- Best practices

**Audience:** Advanced users, developers
**Length:** ~1,200 lines
**Includes:** Architecture diagrams, algorithms, configuration

---

### [GOAP API Reference](api/goap.md)
**Goal-Oriented Action Planning module:**
- Core classes (`GOAPPlanner`, `PlanExecutor`)
- State model (`WorldState`, `StateTransition`)
- Actions (`Action`, `ActionBuilder`, `ActionLibrary`)
- Planning (`PlanResult`, `OptimizedPlan`, A* algorithm)
- Execution (`ActionResult`, `ExecutionResult`)
- Code examples for all APIs

**Audience:** Developers, integrators
**Length:** ~900 lines
**Includes:** TypeScript interfaces, code examples, usage patterns

---

### [OODA API Reference](api/ooda.md)
**Observe-Orient-Decide-Act module:**
- Core classes (`OODALoop`, four phase classes)
- Observation phase (observers, observation types)
- Orientation phase (pattern recognition, risk assessment)
- Decision phase (decision types, plan evaluation)
- Action phase (execution, recovery)
- Integration with GOAP
- Code examples

**Audience:** Developers, integrators
**Length:** ~850 lines
**Includes:** TypeScript interfaces, custom observers, integration examples

---

### [Metrics API Reference](api/metrics.md)
**Performance metrics and monitoring:**
- Core classes (`MetricsCollector`, `MetricsStore`, `MetricsReporter`)
- Metric types (`PerformanceMetrics`, `MetricsSnapshot`)
- Collection methods (automatic, manual, event-based)
- Reporting (reports, summaries, comparisons)
- KPIs (execution, quality, OODA, cost)
- Code examples

**Audience:** Developers, analysts
**Length:** ~750 lines
**Includes:** TypeScript interfaces, reporting examples, KPI definitions

---

## Common Use Cases

### I want to learn how to use Task Sentinel
→ Start with **[Usage Guide](usage_guide.md)**
- Read "Quick Start" section
- Follow step-by-step tutorial
- Try command examples

### I want to understand GOAP planning
→ Read **[Phase 2 Guide](phase2_guide.md)** → "GOAP State Model"
- Learn about world states
- Understand A* planning
- See action sequences

### I want to understand OODA loop
→ Read **[Phase 2 Guide](phase2_guide.md)** → "OODA Loop Monitoring"
- Learn the four phases
- Understand adaptive replanning
- See observation examples

### I want to build custom actions
→ Read **[GOAP API](api/goap.md)** → "Actions"
- Use `ActionBuilder`
- Define preconditions and effects
- See code examples

### I want to create custom observers
→ Read **[OODA API](api/ooda.md)** → "Observation Phase"
- Extend `ObservationSource`
- Implement `observe()` method
- See custom observer examples

### I want to collect custom metrics
→ Read **[Metrics API](api/metrics.md)** → "Collection Methods"
- Extend `MetricsCollector`
- Record custom metrics
- Generate reports

### I need to troubleshoot issues
→ Check **[Usage Guide](usage_guide.md)** → "Troubleshooting"
→ And **[Phase 2 Guide](phase2_guide.md)** → "Troubleshooting"
- Common issues and solutions
- Diagnostic commands
- Configuration fixes

---

## Documentation Conventions

### Command Syntax
```bash
/task-create --title "Task name" --priority 5000
# ^ Slash command format used throughout
```

### Code Blocks
```typescript
// TypeScript interfaces and examples
interface Example {
  property: string;
}
```

### File Paths
- Absolute paths: `/workspaces/Task-Sentinel/file.ts`
- Relative paths: `./docs/usage_guide.md`
- Config paths: `.tasksentinel/goap.json`

### Examples
Examples follow this pattern:
1. Setup/context
2. Command or code
3. Expected output
4. Explanation

---

## Version History

### Version 2.0.0 (Phase 2) - 2025-10-30
**New Documentation:**
- Phase 2 Guide (GOAP + OODA)
- GOAP API Reference
- OODA API Reference
- Metrics API Reference
- Phase 2 integration in Usage Guide

**Features Documented:**
- Goal-Oriented Action Planning (GOAP)
- A* pathfinding for optimal action sequences
- OODA loop monitoring (Observe-Orient-Decide-Act)
- Adaptive replanning
- Performance metrics and KPIs
- State-based world modeling
- Pattern recognition and learning
- Quality gates integration

### Version 1.0.0 (Phase 1) - 2025-10-15
**Initial Documentation:**
- Usage Guide
- Command reference
- Workflow patterns
- Agent coordination
- Distributed systems features

---

## Contributing to Documentation

### Guidelines
1. **Clarity**: Write for users at all skill levels
2. **Examples**: Include working code examples
3. **Accuracy**: Test all commands and code
4. **Consistency**: Follow existing patterns
5. **Completeness**: Cover all use cases

### Structure
- Use clear headings and sections
- Include table of contents for long documents
- Add cross-references between documents
- Provide both simple and advanced examples

### Code Examples
```typescript
// Good: Clear, commented, complete
interface WorldState {
  hasRequirements: boolean;  // Initial state
  hasImplementation: boolean; // Goal state
}

// Bad: Incomplete or unclear
interface State { x: boolean; }
```

---

## Getting Help

### Documentation Issues
If you find errors or have suggestions:
1. Check if issue exists: [GitHub Issues](https://github.com/yourusername/Task-Sentinel/issues)
2. Create new issue with `documentation` label
3. Include document name and section

### Usage Questions
For usage questions:
1. Check **[Usage Guide](usage_guide.md)** → Troubleshooting
2. Check **[Phase 2 Guide](phase2_guide.md)** → Troubleshooting
3. Search existing issues
4. Create new issue with `question` label

### Feature Requests
For feature documentation requests:
1. Create issue with `enhancement` label
2. Describe the feature or API
3. Suggest documentation structure

---

## External Resources

### Related Projects
- **[Claude Flow](https://github.com/ruvnet/claude-flow)** - Agent orchestration framework
- **[Claude Code](https://docs.anthropic.com/claude-code)** - Official Claude Code documentation

### Concepts
- **GOAP**: [Goal-Oriented Action Planning](https://en.wikipedia.org/wiki/Goal-oriented_action_planning)
- **OODA Loop**: [OODA Loop Decision Making](https://en.wikipedia.org/wiki/OODA_loop)
- **A* Algorithm**: [A* Pathfinding](https://en.wikipedia.org/wiki/A*_search_algorithm)

### Tools
- **GitHub CLI**: [gh documentation](https://cli.github.com/manual/)
- **Node.js**: [Node.js docs](https://nodejs.org/docs/)
- **TypeScript**: [TypeScript handbook](https://www.typescriptlang.org/docs/)

---

## License

Documentation is part of Task Sentinel and follows the same license as the main project.

See [LICENSE](../LICENSE) for details.

---

**Questions?** Create an issue or check the [Usage Guide](usage_guide.md) troubleshooting section.

**Contributing?** See contributing guidelines in the main [README](../README.md).
