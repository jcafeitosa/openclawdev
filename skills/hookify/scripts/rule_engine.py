#!/usr/bin/env python3
"""Hookify Rule Engine — evaluates rules against hook input."""

import json
import re
import sys
from functools import lru_cache
from typing import List, Dict, Any, Optional

# Add scripts dir to path
import os
sys.path.insert(0, os.path.dirname(__file__))
from config_loader import Rule, Condition, load_rules


@lru_cache(maxsize=128)
def compile_regex(pattern: str) -> re.Pattern:
    return re.compile(pattern, re.IGNORECASE)


class RuleEngine:
    def evaluate_rules(self, rules: List[Rule], input_data: Dict[str, Any]) -> Dict[str, Any]:
        hook_event = input_data.get("hook_event_name", "PreToolUse")
        blocking_rules = []
        warning_rules = []

        for rule in rules:
            if self._rule_matches(rule, input_data):
                if rule.action == "block":
                    blocking_rules.append(rule)
                else:
                    warning_rules.append(rule)

        if blocking_rules:
            messages = [f"**[{r.name}]**\n{r.message}" for r in blocking_rules]
            combined = "\n\n".join(messages)
            if hook_event == "Stop":
                return {"decision": "block", "reason": combined, "systemMessage": combined}
            return {
                "hookSpecificOutput": {
                    "hookEventName": hook_event,
                    "permissionDecision": "deny"
                },
                "systemMessage": combined
            }

        if warning_rules:
            messages = [f"**[{r.name}]**\n{r.message}" for r in warning_rules]
            return {"systemMessage": "\n\n".join(messages)}

        return {}

    def _rule_matches(self, rule: Rule, input_data: Dict[str, Any]) -> bool:
        tool_name = input_data.get("tool_name", "")
        tool_input = input_data.get("tool_input", {})

        if rule.tool_matcher and rule.tool_matcher != "*":
            if tool_name not in rule.tool_matcher.split("|"):
                return False

        if not rule.conditions:
            return False

        for condition in rule.conditions:
            if not self._check_condition(condition, tool_name, tool_input, input_data):
                return False

        return True

    def _check_condition(self, condition: Condition, tool_name: str,
                         tool_input: Dict, input_data: Dict) -> bool:
        value = self._extract_field(condition.field, tool_name, tool_input, input_data)
        if value is None:
            return False

        op = condition.operator
        pattern = condition.pattern

        if op == "regex_match":
            try:
                return bool(compile_regex(pattern).search(value))
            except re.error:
                return False
        elif op == "contains":
            return pattern in value
        elif op == "equals":
            return pattern == value
        elif op == "not_contains":
            return pattern not in value
        elif op == "starts_with":
            return value.startswith(pattern)
        elif op == "ends_with":
            return value.endswith(pattern)
        return False

    def _extract_field(self, field: str, tool_name: str,
                       tool_input: Dict, input_data: Dict) -> Optional[str]:
        if field in tool_input:
            val = tool_input[field]
            return str(val) if not isinstance(val, str) else val

        if input_data:
            if field == "reason":
                return input_data.get("reason", "")
            if field == "user_prompt":
                return input_data.get("user_prompt", "")
            if field == "transcript":
                path = input_data.get("transcript_path")
                if path:
                    try:
                        with open(path) as f:
                            return f.read()
                    except Exception:
                        return ""

        if tool_name == "Bash":
            if field in ("command", "new_text", "content"):
                return tool_input.get("command", "")
        elif tool_name in ("Write", "Edit"):
            if field in ("content", "new_text", "new_string"):
                return tool_input.get("content") or tool_input.get("new_string", "")
            elif field in ("old_text", "old_string"):
                return tool_input.get("old_string", "")
            elif field == "file_path":
                return tool_input.get("file_path", "")
        elif tool_name == "MultiEdit":
            if field == "file_path":
                return tool_input.get("file_path", "")
            elif field in ("new_text", "content"):
                edits = tool_input.get("edits", [])
                return " ".join(e.get("new_string", "") for e in edits)

        return None


def main():
    """CLI entrypoint — reads JSON from stdin, evaluates rules, outputs result."""
    try:
        input_data = json.load(sys.stdin)
    except json.JSONDecodeError as e:
        print(json.dumps({"systemMessage": f"Hookify parse error: {e}"}))
        sys.exit(0)

    tool_name = input_data.get("tool_name", "")
    event = None
    if tool_name == "Bash":
        event = "bash"
    elif tool_name in ("Edit", "Write", "MultiEdit"):
        event = "file"

    hook_event = input_data.get("hook_event_name", "")
    if hook_event == "Stop":
        event = "stop"
    elif hook_event == "UserPromptSubmit":
        event = "prompt"

    rules = load_rules(event=event)
    engine = RuleEngine()
    result = engine.evaluate_rules(rules, input_data)
    print(json.dumps(result))
    sys.exit(0)


if __name__ == "__main__":
    main()
