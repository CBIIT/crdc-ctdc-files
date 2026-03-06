# Makefile for Gen3 File Proxy Service

.PHONY: help install dev test lint format clean docker-build docker-run docker-up docker-down coveralls coverage-report

help:
	@echo "Available commands:"
	@echo "  make install         - Install production dependencies"
	@echo "  make dev             - Install development dependencies"
	@echo "  make run             - Run development server"
	@echo "  make test            - Run tests"
	@echo "  make test-cov        - Run tests with coverage reports"
	@echo "  make coveralls       - Run tests and upload to Coveralls"
	@echo "  make coverage-report - Generate coverage report"
	@echo "  make lint            - Run linters"
	@echo "  make format          - Format code"
	@echo "  make clean           - Remove build artifacts"
	@echo "  make docker-build    - Build Docker image"
	@echo "  make docker-run      - Run Docker container"
	@echo "  make docker-up       - Start with docker-compose"
	@echo "  make docker-down     - Stop docker-compose"

install:
	pip install -r requirements.txt

dev:
	pip install -r requirements.txt
	pip install black flake8 mypy

run:
	python main.py

run-prod:
	gunicorn -c gunicorn.conf.py main:app

test:
	pytest

test-cov:
	pytest --cov=. --cov-report=html --cov-report=term --cov-report=xml --cov-report=lcov

coveralls:
	pytest --cov=. --cov-report=lcov
	coveralls

coverage-report:
	coverage report --show-missing
	coverage html

lint:
	flake8 . --exclude venv,__pycache__
	mypy . --exclude venv

format:
	black .

clean:
	find . -type d -name __pycache__ -exec rm -rf {} +
	find . -type f -name "*.pyc" -delete
	rm -rf .pytest_cache
	rm -rf htmlcov
	rm -rf .coverage
	rm -rf coverage.xml
	rm -rf coverage.lcov
	rm -rf .nyc_output

docker-build:
	docker build -t gen3-file-proxy:latest .

docker-run:
	docker run -d -p 8000:8000 --env-file .env --name gen3-file-proxy gen3-file-proxy:latest

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

docker-logs:
	docker-compose logs -f
