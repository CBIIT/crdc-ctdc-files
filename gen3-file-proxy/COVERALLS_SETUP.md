# Coveralls Setup Guide

This project is configured to work with Coveralls for test coverage tracking.

## Setup Instructions

### 1. Enable Coveralls for Your Repository

1. Go to [https://coveralls.io](https://coveralls.io)
2. Sign in with your GitHub account
3. Add your repository (enable the repo in Coveralls)
4. Get your repository token

### 2. Configure Repository Token

For local testing:
```bash
export COVERALLS_REPO_TOKEN="your_token_here"
```

For GitHub Actions:
- The token is automatically provided via `secrets.GITHUB_TOKEN`
- No additional configuration needed

For other CI systems, add `COVERALLS_REPO_TOKEN` as a secret/environment variable.

### 3. Update README Badge URLs

Replace the placeholder URLs in README.md:
```markdown
[![Coverage Status](https://coveralls.io/repos/github/YOUR-ORG/gen3-file-proxy/badge.svg?branch=main)](https://coveralls.io/github/YOUR-ORG/gen3-file-proxy?branch=main)
```

### 4. Run Tests with Coverage

#### Local Development
```bash
# Generate coverage reports
make test-cov

# Upload to Coveralls
make coveralls
```

#### GitHub Actions (Automatic)
The `.github/workflows/test.yml` workflow automatically:
- Runs tests with coverage on every push and pull request
- Uploads coverage to Coveralls
- Also uploads to Codecov as an alternative
- Generates a coverage summary in the GitHub Actions UI

### 5. Coverage Reports

Multiple report formats are generated:

- **Terminal**: Printed during test run
- **HTML**: View in browser at `htmlcov/index.html`
- **XML**: For tools like Codecov (`coverage.xml`)
- **LCOV**: For Coveralls (`coverage.lcov`)

### 6. Coverage Configuration

Coverage settings are in `pytest.ini`:

```ini
[coverage:run]
source = .
omit = 
    tests/*
    venv/*
    __pycache__/*
    examples/*
    */__init__.py
relative_files = True

[coverage:report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
    @abstractmethod
precision = 2
```

### 7. Coverage Goals

Aim for:
- Overall coverage: **>80%**
- Critical paths (auth, file streaming): **>90%**
- Utility functions: **>70%**

### 8. Excluding Code from Coverage

Add `# pragma: no cover` to lines that shouldn't be measured:

```python
def debug_only_function():  # pragma: no cover
    """This function is only for debugging."""
    pass
```

### 9. Alternative: Codecov

The GitHub Actions workflow also uploads to Codecov as an alternative to Coveralls. Both services provide similar functionality:

- **Coveralls**: [https://coveralls.io](https://coveralls.io)
- **Codecov**: [https://codecov.io](https://codecov.io)

You can use either or both. Codecov badge:
```markdown
[![codecov](https://codecov.io/gh/YOUR-ORG/gen3-file-proxy/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR-ORG/gen3-file-proxy)
```

## Troubleshooting

### "422 Unprocessable Entity" from Coveralls

- Check that `COVERALLS_REPO_TOKEN` is set correctly
- Ensure the token matches your repository
- Verify the repository is enabled on Coveralls

### Coverage Not Uploading

- Ensure `coverage.lcov` file is generated
- Check GitHub Actions logs for upload errors
- Verify network connectivity to coveralls.io

### Low Coverage on Init Files

Init files are excluded by default. If needed, remove `*/__init__.py` from the `omit` list in `pytest.ini`.

## Resources

- [Coveralls Documentation](https://docs.coveralls.io/)
- [pytest-cov Documentation](https://pytest-cov.readthedocs.io/)
- [Coverage.py Documentation](https://coverage.readthedocs.io/)
