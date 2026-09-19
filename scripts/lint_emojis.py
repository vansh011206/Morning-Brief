#!/usr/bin/env python3
"""
Emoji Linter for MorningBrief
Strictly scans templates, frontend source code, and backend apps for forbidden Unicode emoji characters.
Enforces the Global Design System requirement of Lucide SVG icons only.
"""

import os
import re
import sys
from pathlib import Path

# Common emoji Unicode code point ranges
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F600-\U0001F64F"  # Emoticons
    "\U0001F300-\U0001F5FF"  # Symbols & Pictographs
    "\U0001F680-\U0001F6FF"  # Transport & Map
    "\U0001F1E0-\U0001F1FF"  # Flags
    "\U00002702-\U000027B0"  # Dingbats
    "\U000024C2-\U0001F251"  # Enclosed Alphanumerics
    "\U0001F900-\U0001F9FF"  # Supplemental Symbols & Pictographs
    "\U0001FA70-\U0001FAFF"  # Symbols and Pictographs Extended-A
    "]+",
    flags=re.UNICODE,
)

SEARCH_EXTENSIONS = {'.html', '.txt', '.py', '.ts', '.tsx', '.css', '.json'}
EXCLUDE_DIRS = {
    'node_modules', 'venv', '.venv', '.git', 'dist', 'build',
    '__pycache__', '.pytest_cache', 'staticfiles', '.system_generated'
}

# Allow tests that specifically test emoji detection
ALLOWED_TEST_FILES = {
    'lint_emojis.py',
    'test_delivery.py',
    'tests.py',
}


def check_file(filepath: Path) -> list[tuple[int, str]]:
    violations = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            for line_num, line in enumerate(f, 1):
                # Skip comments or test strings in allowed test files
                if filepath.name in ALLOWED_TEST_FILES:
                    continue
                match = EMOJI_PATTERN.search(line)
                if match:
                    violations.append((line_num, match.group()))
    except Exception as e:
        print(f"Warning: Could not read {filepath}: {e}", file=sys.stderr)
    return violations


def main():
    root_dir = Path(__file__).resolve().parent.parent
    targets = [
        root_dir / 'backend' / 'templates',
        root_dir / 'backend' / 'apps',
        root_dir / 'frontend' / 'src',
    ]

    total_violations = 0
    scanned_files = 0

    print("Checking for forbidden emoji characters across codebase...")

    for target in targets:
        if not target.exists():
            continue
        for root, dirs, files in os.walk(target):
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
            for file in files:
                p = Path(root) / file
                if p.suffix in SEARCH_EXTENSIONS:
                    scanned_files += 1
                    violations = check_file(p)
                    if violations:
                        for line_no, emoji_char in violations:
                            print(f"[EMOJI VIOLATION] {p.relative_to(root_dir)}:{line_no} -> Found: {emoji_char}")
                            total_violations += 1

    if total_violations > 0:
        print(f"\nFAILED: Found {total_violations} forbidden emoji(s) in {scanned_files} files.")
        print("MorningBrief strictly enforces the Global Design System: Lucide icons only, NO emojis.")
        sys.exit(1)
    else:
        print(f"\nSUCCESS: Zero emojis found across {scanned_files} files scanned.")
        sys.exit(0)


if __name__ == '__main__':
    main()
