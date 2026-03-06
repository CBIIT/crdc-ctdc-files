"""Pytest configuration."""
import pytest


@pytest.fixture
def anyio_backend():
    """Use asyncio as the backend for async tests."""
    return "asyncio"
