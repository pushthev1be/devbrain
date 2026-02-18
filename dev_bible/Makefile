.PHONY: stats search validate add-lesson add-mistake add-pattern add-principle add-runbook add-decision help

BIBLE_FILE := bible.jsonl

help:
	@echo "DevBrain Knowledge Base Commands"
	@echo ""
	@echo "Search & View:"
	@echo "  make stats            Show knowledge base statistics"
	@echo "  make search TAG=x     Search by tag"
	@echo ""
	@echo "Add Lessons:"
	@echo "  make add-lesson       Interactive lesson creation (choose type)"
	@echo "  make add-mistake      Add a MISTAKE lesson"
	@echo "  make add-pattern      Add a PATTERN lesson"
	@echo "  make add-principle    Add a PRINCIPLE lesson"
	@echo "  make add-runbook      Add a RUNBOOK lesson"
	@echo "  make add-decision     Add a DECISION lesson"
	@echo ""
	@echo "Validation:"
	@echo "  make validate         Check JSON formatting and structure"
	@echo ""

stats:
	@echo "=== DevBrain Knowledge Base Stats ==="
	@echo "Total lessons: $$(wc -l < $(BIBLE_FILE))"
	@echo "Principles:    $$(grep -c '"type":"PRINCIPLE"' $(BIBLE_FILE) || echo 0)"
	@echo "Patterns:      $$(grep -c '"type":"PATTERN"' $(BIBLE_FILE) || echo 0)"
	@echo "Mistakes:      $$(grep -c '"type":"MISTAKE"' $(BIBLE_FILE) || echo 0)"
	@echo "Runbooks:      $$(grep -c '"type":"RUNBOOK"' $(BIBLE_FILE) || echo 0)"
	@echo "Decisions:     $$(grep -c '"type":"DECISION"' $(BIBLE_FILE) || echo 0)"
	@echo ""
	@echo "DevBrain-specific:"
	@grep '"devbrain"' $(BIBLE_FILE) | wc -l | xargs echo "  DevBrain lessons:"

search:
ifndef TAG
	@echo "Usage: make search TAG=yourTag"
	@echo "Example: make search TAG=devbrain"
	@echo "Example: make search TAG=error-handling"
else
	@grep '"$(TAG)"' $(BIBLE_FILE) || echo "No lessons found with tag: $(TAG)"
endif

validate:
	@python3 validate.py $(BIBLE_FILE)

add-lesson:
	@echo "Choose lesson type:"
	@echo "  1) PRINCIPLE"
	@echo "  2) PATTERN"
	@echo "  3) MISTAKE"
	@echo "  4) RUNBOOK"
	@echo "  5) DECISION"
	@echo ""
	@read -p "Enter choice (1-5): " choice; \
	case $$choice in \
		1) $(MAKE) add-principle ;; \
		2) $(MAKE) add-pattern ;; \
		3) $(MAKE) add-mistake ;; \
		4) $(MAKE) add-runbook ;; \
		5) $(MAKE) add-decision ;; \
		*) echo "Invalid choice" ;; \
	esac

add-principle:
	@echo "=== Add PRINCIPLE ==="
	@read -p "ID (e.g., p.unique_name): " id; \
	read -p "Text: " text; \
	read -p "Tags (comma-separated): " tags; \
	echo "{\"type\":\"PRINCIPLE\",\"id\":\"$$id\",\"text\":\"$$text\",\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	echo "✓ PRINCIPLE added"

add-pattern:
	@echo "=== Add PATTERN ==="
	@read -p "ID (e.g., pat.name.v1): " id; \
	read -p "Name: " name; \
	read -p "When to use it: " when; \
	read -p "Steps (comma-separated): " steps; \
	read -p "Tags (comma-separated): " tags; \
	echo "{\"type\":\"PATTERN\",\"id\":\"$$id\",\"name\":\"$$name\",\"when\":\"$$when\",\"steps\":[\"$${steps//,/\",\"}\"],\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	echo "✓ PATTERN added"

add-mistake:
	@echo "=== Add MISTAKE ==="
	@read -p "ID (e.g., m.bug_name.2025-02-18): " id; \
	read -p "Symptom (what went wrong): " symptom; \
	read -p "Root cause (why it happened): " root; \
	read -p "Fix step 1: " fix1; \
	read -p "Fix step 2 (optional): " fix2; \
	read -p "Tags (comma-separated): " tags; \
	if [ -z "$$fix2" ]; then \
		echo "{\"type\":\"MISTAKE\",\"id\":\"$$id\",\"symptom\":\"$$symptom\",\"root_cause\":\"$$root\",\"fix_steps\":[\"$$fix1\"],\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	else \
		echo "{\"type\":\"MISTAKE\",\"id\":\"$$id\",\"symptom\":\"$$symptom\",\"root_cause\":\"$$root\",\"fix_steps\":[\"$$fix1\",\"$$fix2\"],\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	fi; \
	echo "✓ MISTAKE added"

add-runbook:
	@echo "=== Add RUNBOOK ==="
	@read -p "ID (e.g., rb.task_name.v1): " id; \
	read -p "Title: " title; \
	read -p "Steps (comma-separated): " steps; \
	read -p "Tags (comma-separated): " tags; \
	echo "{\"type\":\"RUNBOOK\",\"id\":\"$$id\",\"title\":\"$$title\",\"steps\":[\"$${steps//,/\",\"}\"],\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	echo "✓ RUNBOOK added"

add-decision:
	@echo "=== Add DECISION ==="
	@read -p "ID (e.g., d.choice_name.2025-02-18): " id; \
	read -p "Question (what did you decide?): " question; \
	read -p "Decision (your choice): " decision; \
	read -p "Reason (why): " reason; \
	read -p "Tags (comma-separated): " tags; \
	echo "{\"type\":\"DECISION\",\"id\":\"$$id\",\"question\":\"$$question\",\"decision\":\"$$decision\",\"reason\":\"$$reason\",\"tags\":[\"$${tags//,/\",\"}\"]}" >> $(BIBLE_FILE); \
	echo "✓ DECISION added"
