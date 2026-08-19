# Specification Quality Checklist: Climbing a floor, made visible

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-19
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

Two items needed a second pass.

**"No implementation details"** failed first time. The Context table named the
two climb constants and quoted the platform's height in scene units. Both are
how the code says it, not what a teacher or a child meets. The table now states
the fault — a floor number that means two things, a block drawn below the
ground — and the constants belong in the plan. The evidence stays, because a
defect table nobody can check is a claim rather than evidence.

**"Success criteria are technology-agnostic"** failed on an earlier criterion
reading "the platform's top face renders above the ground plane". That is a
statement about a renderer. It is now SC-002 — every platform placed is visible
in the preview at once — the same property, stated as the teacher's experience,
and checkable by looking.

One judgement is recorded rather than hidden: SC-003 and SC-004 need a person
who has not read the spec. No automated check stands in for "a child can tell a
climb from a fall", and pretending otherwise is how three of spec 012's look
criteria went unwalked. The plan must name who looks, and when.
