#!/usr/bin/env python3
"""
Static audit for logging routing separation.

Policy:
- access_logger.info(...) is only allowed in explicit audit/auth/request files.
- logger.* calls are application logs and expected to route to app.log.

This script is intentionally simple and dependency-free.
"""

from __future__ import annotations

import ast
from pathlib import Path
from typing import Iterable


REPO_ROOT = Path(__file__).resolve().parents[1]
APP_ROOT = REPO_ROOT / "app"

# Files where INFO-level access events are intentionally expected.
ACCESS_INFO_ALLOWED = {
    "app/__init__.py",
    "app/admin.py",
    "app/auth.py",
    "app/blueprints/public/routes.py",
}


def iter_python_files(root: Path) -> Iterable[Path]:
    for path in root.rglob("*.py"):
        # Skip cache directories.
        if "__pycache__" in path.parts:
            continue
        yield path


def rel(path: Path) -> str:
    return path.relative_to(REPO_ROOT).as_posix()


def main() -> int:
    violations: list[str] = []
    total_calls = 0
    access_calls = 0
    app_calls = 0

    for file_path in sorted(iter_python_files(APP_ROOT)):
        source = file_path.read_text(encoding="utf-8")
        tree = ast.parse(source, filename=str(file_path))
        file_rel = rel(file_path)

        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if not isinstance(node.func.value, ast.Name):
                continue

            logger_name = node.func.value.id
            level = node.func.attr
            if logger_name not in {"logger", "access_logger"}:
                continue
            if level not in {"debug", "info", "warning", "error", "critical", "exception"}:
                continue

            total_calls += 1
            if logger_name == "access_logger":
                access_calls += 1
                if level == "info" and file_rel not in ACCESS_INFO_ALLOWED:
                    violations.append(
                        f"{file_rel}:{node.lineno} uses access_logger.info outside allowed audit files"
                    )
            else:
                app_calls += 1

    print(f"Audited logging calls: total={total_calls}, app={app_calls}, access={access_calls}")
    if violations:
        print("Violations:")
        for violation in violations:
            print(f"- {violation}")
        return 1

    print("OK: log routing policy satisfied.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
