# Architecture Examples Summary

This document provides a quick reference to all language-specific examples available in the architecture skill.

## Available Languages

| Language   | Examples Path                   | Key Topics                                                                                                                |
| ---------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| TypeScript | `examples/typescript/README.md` | SoC, SRP, DRY, KISS, Composition, High Cohesion/Low Coupling, Explicit Dependencies, Fail Fast, Immutability, Testability |
| Go         | `examples/golang/README.md`     | SoC, SRP, DRY, KISS, Composition, High Cohesion/Low Coupling, Explicit Dependencies, Fail Fast, Immutability, Testability |
| Rust       | `examples/rust/README.md`       | SoC, SRP, DRY, KISS, Composition, High Cohesion/Low Coupling, Explicit Dependencies, Fail Fast, Immutability, Testability |
| Python     | `examples/python/README.md`     | SoC, SRP, DRY, KISS, Composition, High Cohesion/Low Coupling, Explicit Dependencies, Fail Fast, Immutability, Testability |
| Java       | `examples/java/README.md`       | SoC, SRP, DRY, KISS, Composition, High Cohesion/Low Coupling, Explicit Dependencies, Fail Fast, Immutability, Testability |

## Quick Reference

### 10 Core Principles

1. **Separation of Concerns (SoC)** - Code must be clearly separated by layers/modules
2. **Single Responsibility (SRP)** - Each component/function does one thing
3. **Don't Repeat Yourself (DRY)** - Abstract repeated logic
4. **Keep It Simple (KISS)** - Prefer simple solutions, avoid over-engineering
5. **Composition Over Inheritance** - Use composition instead of deep inheritance
6. **High Cohesion, Low Coupling** - Related functionality together, minimal dependencies
7. **Explicit Dependencies** - All dependencies declared and injected
8. **Fail Fast** - Input validation, immediate failure with clear errors
9. **Immutability by Default** - Prefer immutable data structures
10. **Testability First** - Design for easy testing

### Usage

When you need language-specific examples:

1. Identify the principle you want to apply
2. Check the corresponding language example file
3. Copy the pattern that fits your use case
4. Adapt to your specific requirements

### Example Search

```bash
# Find all examples for a specific principle
grep -r "Explicit Dependencies" architecture/examples/

# Find examples in a specific language
cat architecture/examples/typescript/README.md | grep -A 10 "SRP"
```

---

**Last Updated**: 2026-01-13
