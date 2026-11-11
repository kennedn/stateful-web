.PHONY: discover build serve test legacy-check

discover:
	python3 scripts/discover.py

legacy-check:
	python3 scripts/verify_legacy.py

build: legacy-check discover
	hugo --minify

serve: legacy-check
	hugo server --bind 0.0.0.0 --port 5173

test: legacy-check
	python3 -m unittest discover -s tests -v
