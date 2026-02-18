#!/usr/bin/env python3
"""Config loader for hookify rule engine."""

import os
import re
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class Condition:
    field: str
    operator: str
    pattern: str


@dataclass
class Rule:
    name: str
    enabled: bool
    event: str
    conditions: List[Condition]
    message: str
    action: str = "warn"
    tool_matcher: Optional[str] = None


def parse_frontmatter(content: str):
    """Parse YAML frontmatter from markdown file."""
    if not content.startswith("---"):
        return {}, content

    end = content.find("---", 3)
    if end == -1:
        return {}, content

    frontmatter_str = content[3:end].strip()
    body = content[end + 3:].strip()

    # Simple YAML parser for our use case
    data = {}
    current_key = None
    conditions = []
    in_conditions = False
    current_condition = {}

    for line in frontmatter_str.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue

        if stripped == "conditions:":
            in_conditions = True
            continue

        if in_conditions:
            if stripped.startswith("- field:"):
                if current_condition:
                    conditions.append(current_condition.copy())
                    current_condition = {}
                current_condition["field"] = stripped[8:].strip()
            elif stripped.startswith("field:"):
                current_condition["field"] = stripped[6:].strip()
            elif stripped.startswith("operator:"):
                current_condition["operator"] = stripped[9:].strip()
            elif stripped.startswith("pattern:"):
                current_condition["pattern"] = stripped[8:].strip()
            elif ":" in stripped and not stripped.startswith("-"):
                # New top-level key, exit conditions
                in_conditions = False
                if current_condition:
                    conditions.append(current_condition.copy())
                key, _, val = stripped.partition(":")
                data[key.strip()] = val.strip()
            continue

        if ":" in stripped:
            key, _, val = stripped.partition(":")
            data[key.strip()] = val.strip()

    if current_condition:
        conditions.append(current_condition)

    if conditions:
        data["conditions"] = conditions

    return data, body


def load_rules(project_dir: str = None, event: str = None) -> List[Rule]:
    """Load all hookify rules from .claude/ directory."""
    if project_dir is None:
        project_dir = os.environ.get("CLAUDE_PROJECT_DIR", os.getcwd())

    rules_dir = os.path.join(project_dir, ".claude")
    rules = []

    if not os.path.exists(rules_dir):
        return rules

    for filename in os.listdir(rules_dir):
        if not filename.startswith("hookify.") or not filename.endswith(".local.md"):
            continue

        filepath = os.path.join(rules_dir, filename)
        try:
            with open(filepath, "r") as f:
                content = f.read()
        except (IOError, OSError):
            continue

        data, body = parse_frontmatter(content)

        if not data.get("name") or not data.get("event"):
            continue

        rule_event = data.get("event", "all")

        # Filter by event if specified
        if event and rule_event != "all" and rule_event != event:
            continue

        # Skip disabled rules
        enabled_val = data.get("enabled", "true")
        if str(enabled_val).lower() in ("false", "0", "no"):
            continue

        # Build conditions
        conditions = []
        if "conditions" in data:
            for c in data["conditions"]:
                conditions.append(Condition(
                    field=c.get("field", ""),
                    operator=c.get("operator", "contains"),
                    pattern=c.get("pattern", "")
                ))
        elif "pattern" in data:
            # Simple single-condition rule
            default_field = "command" if event == "bash" else "new_text"
            conditions.append(Condition(
                field=default_field,
                operator="regex_match",
                pattern=data["pattern"]
            ))

        rules.append(Rule(
            name=data["name"],
            enabled=True,
            event=rule_event,
            conditions=conditions,
            message=body,
            action=data.get("action", "warn"),
            tool_matcher=data.get("tool_matcher")
        ))

    return rules
