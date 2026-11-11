.PHONY: discover build serve test

discover:
	python3 scripts/discover.py

build: discover
	hugo --minify

serve:
	hugo server --bind 0.0.0.0 --port 5173

test:
	python3 -m unittest discover -s tests -v
