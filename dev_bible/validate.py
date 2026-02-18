#!/usr/bin/env python3
"""
Validator for DevBrain Knowledge Base (bible.jsonl).

Usage:
    python3 validate.py bible.jsonl
    
Returns exit code 0 if valid, 1 if invalid.
"""

import json
import sys
from typing import Dict, List, Set

REQUIRED_FIELDS = {
    "PRINCIPLE": ["type", "id", "text", "tags"],
    "PATTERN": ["type", "id", "name", "when", "steps", "tags"],
    "MISTAKE": ["type", "id", "symptom", "root_cause", "fix_steps", "tags"],
    "RUNBOOK": ["type", "id", "title", "steps", "tags"],
    "DECISION": ["type", "id", "question", "decision", "reason", "tags"],
}

VALID_TYPES = set(REQUIRED_FIELDS.keys())


def validate_lesson(line_num: int, line: str) -> List[str]:
    errors = []
    
    try:
        lesson = json.loads(line)
    except json.JSONDecodeError as e:
        return [f"Line {line_num}: Invalid JSON - {e}"]
    
    if not isinstance(lesson, dict):
        return [f"Line {line_num}: Expected JSON object, got {type(lesson).__name__}"]
    
    lesson_type = lesson.get("type")
    if not lesson_type:
        errors.append(f"Line {line_num}: Missing 'type' field")
        return errors
    
    if lesson_type not in VALID_TYPES:
        errors.append(f"Line {line_num}: Invalid type '{lesson_type}'. Must be one of: {', '.join(VALID_TYPES)}")
        return errors
    
    required = REQUIRED_FIELDS[lesson_type]
    for field in required:
        if field not in lesson:
            errors.append(f"Line {line_num}: Missing required field '{field}' for type {lesson_type}")
    
    if "id" in lesson and not isinstance(lesson["id"], str):
        errors.append(f"Line {line_num}: Field 'id' must be a string")
    
    if "tags" in lesson:
        if not isinstance(lesson["tags"], list):
            errors.append(f"Line {line_num}: Field 'tags' must be an array")
        elif not all(isinstance(tag, str) for tag in lesson["tags"]):
            errors.append(f"Line {line_num}: All tags must be strings")
    
    if lesson_type == "PATTERN" or lesson_type == "RUNBOOK":
        steps_field = "steps"
        if steps_field in lesson:
            if not isinstance(lesson[steps_field], list):
                errors.append(f"Line {line_num}: Field '{steps_field}' must be an array")
            elif not all(isinstance(step, str) for step in lesson[steps_field]):
                errors.append(f"Line {line_num}: All {steps_field} must be strings")
    
    if lesson_type == "MISTAKE" and "fix_steps" in lesson:
        if not isinstance(lesson["fix_steps"], list):
            errors.append(f"Line {line_num}: Field 'fix_steps' must be an array")
        elif not all(isinstance(step, str) for step in lesson["fix_steps"]):
            errors.append(f"Line {line_num}: All fix_steps must be strings")
    
    return errors


def validate_file(filepath: str) -> bool:
    all_errors = []
    seen_ids: Set[str] = set()
    line_count = 0
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            lines = f.readlines()
    except FileNotFoundError:
        print(f"Error: File '{filepath}' not found", file=sys.stderr)
        return False
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        return False
    
    if not lines:
        print(f"Warning: File '{filepath}' is empty")
        return True
    
    for line_num, line in enumerate(lines, start=1):
        line = line.strip()
        if not line:
            continue
        
        line_count += 1
        errors = validate_lesson(line_num, line)
        all_errors.extend(errors)
        
        try:
            lesson = json.loads(line)
            lesson_id = lesson.get("id")
            if lesson_id:
                if lesson_id in seen_ids:
                    all_errors.append(f"Line {line_num}: Duplicate ID '{lesson_id}'")
                seen_ids.add(lesson_id)
        except:
            pass
    
    if all_errors:
        print("Validation failed:\n", file=sys.stderr)
        for error in all_errors:
            print(f"  ✗ {error}", file=sys.stderr)
        return False
    
    print(f"✓ Validation passed! {line_count} lessons validated.")
    print(f"  - {len(seen_ids)} unique IDs")
    return True


def main():
    if len(sys.argv) != 2:
        print("Usage: python3 validate.py <bible.jsonl>")
        sys.exit(1)
    
    filepath = sys.argv[1]
    success = validate_file(filepath)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
