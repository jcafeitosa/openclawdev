#!/usr/bin/env python3
"""
Security Reminder Hook — intercepta edições de arquivo e avisa sobre padrões inseguros.

Configuração em ~/.claude/settings.json:
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Write|Edit|MultiEdit",
      "hooks": [{"type": "command", "command": "python3 /path/to/security_hook.py", "timeout": 10}]
    }]
  }
}

Desabilitar: export ENABLE_SECURITY_REMINDER=0
"""

import json
import os
import random
import sys
from datetime import datetime

SECURITY_PATTERNS = [
    {
        "ruleName": "github_actions_workflow",
        "path_check": lambda path: ".github/workflows/" in path
        and (path.endswith(".yml") or path.endswith(".yaml")),
        "reminder": """⚠️ GitHub Actions Security: Você está editando um workflow.

NUNCA use inputs não sanitizados diretamente em run: commands:
  ❌ run: echo "${{ github.event.issue.title }}"
  
Use env: vars intermediárias:
  ✅ env:
       TITLE: ${{ github.event.issue.title }}
     run: echo "$TITLE"

Inputs perigosos: issue.title, issue.body, pr.title, pr.body, comment.body,
head_commit.message, head.ref — todos podem conter código malicioso.""",
    },
    {
        "ruleName": "child_process_exec",
        "substrings": ["child_process.exec", "exec(", "execSync("],
        "reminder": """⚠️ Command Injection Risk: child_process.exec() é vulnerável a injection.

  ❌ exec(`command ${userInput}`)
  ✅ execFile('command', [userInput])  // sem shell, sem injection

Use execFile ou spawn com arrays de argumentos. Nunca interpole user input em exec().""",
    },
    {
        "ruleName": "new_function_injection",
        "substrings": ["new Function"],
        "reminder": "⚠️ Code Injection: new Function() com strings dinâmicas executa código arbitrário. Considere alternativas sem eval de strings.",
    },
    {
        "ruleName": "eval_injection",
        "substrings": ["eval("],
        "reminder": "⚠️ Code Injection: eval() executa código arbitrário. Use JSON.parse() para dados, ou redesenhe sem eval.",
    },
    {
        "ruleName": "react_dangerously_set_html",
        "substrings": ["dangerouslySetInnerHTML"],
        "reminder": "⚠️ XSS Risk: dangerouslySetInnerHTML com conteúdo não sanitizado é vulnerável a XSS. Use DOMPurify para sanitizar antes de renderizar.",
    },
    {
        "ruleName": "document_write_xss",
        "substrings": ["document.write"],
        "reminder": "⚠️ XSS Risk: document.write() é vulnerável a XSS e tem problemas de performance. Use createElement() + appendChild().",
    },
    {
        "ruleName": "innerHTML_xss",
        "substrings": [".innerHTML =", ".innerHTML="],
        "reminder": "⚠️ XSS Risk: innerHTML com conteúdo não confiável = XSS. Use textContent para texto puro, ou DOMPurify antes de setar innerHTML.",
    },
    {
        "ruleName": "pickle_deserialization",
        "substrings": ["pickle"],
        "reminder": "⚠️ RCE Risk (Python): pickle.loads() com dados não confiáveis executa código arbitrário. Use JSON ou msgpack para serialização segura.",
    },
    {
        "ruleName": "os_system_injection",
        "substrings": ["os.system", "from os import system"],
        "reminder": "⚠️ Command Injection (Python): os.system() com input do usuário é vulnerável. Use subprocess.run(['cmd', arg], shell=False) com lista de argumentos.",
    },
]


def get_state_file(session_id: str) -> str:
    return os.path.expanduser(f"~/.claude/security_hook_state_{session_id}.json")


def load_state(session_id: str) -> set:
    state_file = get_state_file(session_id)
    if os.path.exists(state_file):
        try:
            with open(state_file) as f:
                return set(json.load(f))
        except (json.JSONDecodeError, IOError):
            return set()
    return set()


def save_state(session_id: str, shown: set) -> None:
    state_file = get_state_file(session_id)
    try:
        os.makedirs(os.path.dirname(state_file), exist_ok=True)
        with open(state_file, "w") as f:
            json.dump(list(shown), f)
    except IOError:
        pass


def cleanup_old_states() -> None:
    """Remove state files mais antigos de 30 dias."""
    try:
        state_dir = os.path.expanduser("~/.claude")
        if not os.path.exists(state_dir):
            return
        cutoff = datetime.now().timestamp() - (30 * 24 * 3600)
        for fname in os.listdir(state_dir):
            if fname.startswith("security_hook_state_") and fname.endswith(".json"):
                fpath = os.path.join(state_dir, fname)
                try:
                    if os.path.getmtime(fpath) < cutoff:
                        os.remove(fpath)
                except OSError:
                    pass
    except Exception:
        pass


def check_patterns(file_path: str, content: str):
    normalized = file_path.lstrip("/")
    for pattern in SECURITY_PATTERNS:
        if "path_check" in pattern and pattern["path_check"](normalized):
            return pattern["ruleName"], pattern["reminder"]
        if "substrings" in pattern and content:
            for sub in pattern["substrings"]:
                if sub in content:
                    return pattern["ruleName"], pattern["reminder"]
    return None, None


def extract_content(tool_name: str, tool_input: dict) -> str:
    if tool_name == "Write":
        return tool_input.get("content", "")
    elif tool_name == "Edit":
        return tool_input.get("new_string", "")
    elif tool_name == "MultiEdit":
        edits = tool_input.get("edits", [])
        return " ".join(e.get("new_string", "") for e in edits)
    return ""


def main():
    if os.environ.get("ENABLE_SECURITY_REMINDER", "1") == "0":
        sys.exit(0)

    if random.random() < 0.1:
        cleanup_old_states()

    try:
        input_data = json.loads(sys.stdin.read())
    except json.JSONDecodeError:
        sys.exit(0)

    session_id = input_data.get("session_id", "default")
    tool_name = input_data.get("tool_name", "")
    tool_input = input_data.get("tool_input", {})

    if tool_name not in ("Edit", "Write", "MultiEdit"):
        sys.exit(0)

    file_path = tool_input.get("file_path", "")
    if not file_path:
        sys.exit(0)

    content = extract_content(tool_name, tool_input)
    rule_name, reminder = check_patterns(file_path, content)

    if rule_name and reminder:
        warning_key = f"{file_path}-{rule_name}"
        shown = load_state(session_id)

        if warning_key not in shown:
            shown.add(warning_key)
            save_state(session_id, shown)
            print(reminder, file=sys.stderr)
            sys.exit(2)  # Block — exit code 2 para PreToolUse

    sys.exit(0)


if __name__ == "__main__":
    main()
