"""pytest configuration for all tests."""
import pytest

from pytest import Parser


def pytest_addoption(parser: Parser):
    """Add custom command line options to pytest."""
    parser.addoption(
        "--env-file",
        action="store",
        default=None,
        help="Overridden name to the .env file to load. For example: .env.test",
    )


@pytest.fixture(scope="session")
def env_file(request: pytest.FixtureRequest) -> str:
    """Fixture to provide the env file path."""
    return request.config.getoption("--env-file") or ".env"
