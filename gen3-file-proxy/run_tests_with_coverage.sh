#!/bin/bash

# Run tests with coverage and open report
# Usage: ./run_tests_with_coverage.sh

set -e

echo "=========================================="
echo "Running Tests with Coverage"
echo "=========================================="
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo "❌ Error: pytest not installed"
    echo "Run: pip install -r requirements.txt"
    exit 1
fi

# Run tests with coverage
echo "Running pytest with coverage..."
pytest --cov=. \
       --cov-report=html \
       --cov-report=term \
       --cov-report=xml \
       --cov-report=lcov \
       -v

PYTEST_EXIT=$?

echo ""
echo "=========================================="
echo "Coverage Reports Generated"
echo "=========================================="
echo ""
echo "  • Terminal report shown above"
echo "  • HTML report: htmlcov/index.html"
echo "  • XML report: coverage.xml (for Codecov)"
echo "  • LCOV report: coverage.lcov (for Coveralls)"
echo ""

if [ $PYTEST_EXIT -eq 0 ]; then
    echo "✓ All tests passed!"
    
    # Ask if user wants to open HTML report
    if command -v open &> /dev/null; then
        read -p "Open HTML coverage report in browser? (y/N) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            open htmlcov/index.html
        fi
    fi
else
    echo "❌ Some tests failed"
    exit $PYTEST_EXIT
fi

# Check if COVERALLS_REPO_TOKEN is set
if [ -n "$COVERALLS_REPO_TOKEN" ]; then
    read -p "Upload coverage to Coveralls? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Uploading to Coveralls..."
        coveralls
        echo "✓ Coverage uploaded to Coveralls"
    fi
else
    echo ""
    echo "💡 Tip: Set COVERALLS_REPO_TOKEN to upload coverage to Coveralls"
    echo "   export COVERALLS_REPO_TOKEN='your_token_here'"
fi

echo ""
echo "=========================================="
