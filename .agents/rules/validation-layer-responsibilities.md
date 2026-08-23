# Validation and Layer Responsibility Rules

- Use built-in `class-validator` decorators for DTO field validation whenever they support the required rule.
- Use built-in `class-transformer` utilities for DTO input transformation whenever they support the required transformation.
- Do not implement custom validators or manual field validation when `class-validator` or `class-transformer` already provides the behavior.
- Keep field-level type, format, range, optionality, and transformation rules in request DTOs.
- Perform all remaining validation in the service layer, including cross-field checks and rules that require current application or database state.
- Keep repositories limited to persistence operations and data queries.
- Do not place DTO validation, application error mapping, or business decisions in repositories.
