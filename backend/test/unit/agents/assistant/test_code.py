"""Tests for the primitive Daytona-backed code tool."""

import pytest

from topix.agents.assistant import code as code_module


class FakeArtifacts:
    """Simple stdout container matching the Daytona response shape."""

    def __init__(self, stdout: str = ""):
        """Store captured stdout for assertions."""
        self.stdout = stdout


class FakeResponse:
    """Simple execution response matching the fields used by the tool."""

    def __init__(self, stdout: str = "", result: str = "", exit_code: int = 0):
        """Store response details consumed by the tool."""
        self.artifacts = FakeArtifacts(stdout=stdout)
        self.result = result
        self.exit_code = exit_code


class FakeProcess:
    """Process stub that records calls and returns configurable responses."""

    def __init__(self, response: FakeResponse | Exception):
        """Set the next response or exception for code execution."""
        self._response = response
        self.calls: list[tuple[str, int]] = []

    async def code_run(self, code: str, timeout: int | None = None) -> FakeResponse:
        """Record the call and return the configured response."""
        self.calls.append((code, timeout))
        if isinstance(self._response, Exception):
            raise self._response
        return self._response


class FakeSandbox:
    """Sandbox stub with process access and delete tracking."""

    def __init__(self, response: FakeResponse | Exception):
        """Attach a fake process and initialize delete tracking."""
        self.process = FakeProcess(response)
        self.delete_calls: list[int | None] = []

    async def delete(self, timeout: float | None = None) -> None:
        """Record sandbox deletion attempts."""
        self.delete_calls.append(timeout)


class FakeSandboxManager:
    """Sandbox manager stub that returns a fake sandbox."""

    def __init__(self, response: FakeResponse | Exception):
        """Prepare the sandbox returned by create calls."""
        self.sandbox = FakeSandbox(response)
        self.create_calls = 0

    async def create(self) -> FakeSandbox:
        """Create and return the fake sandbox."""
        self.create_calls += 1
        return self.sandbox

    async def destroy(self, sandbox: FakeSandbox) -> None:
        """Delegate destruction to the fake sandbox."""
        await sandbox.delete(timeout=code_module.CODE_RUN_TIMEOUT_SECONDS)

    async def run_code(self, sandbox: FakeSandbox, code: str) -> tuple[str, str]:
        """Return stdout and stderr using the module's runtime parsing."""
        response = await sandbox.process.code_run(
            code,
            timeout=code_module.CODE_RUN_TIMEOUT_SECONDS,
        )
        artifacts = getattr(response, "artifacts", None)
        stdout = getattr(artifacts, "stdout", "") or getattr(response, "result", "") or ""
        stderr = ""
        if getattr(response, "exit_code", 0) != 0:
            stderr = getattr(response, "result", "") or "Execution failed."
        return stdout, stderr


@pytest.mark.asyncio
async def test_run_code_returns_error_when_daytona_env_is_missing(monkeypatch):
    """Missing Daytona env vars should make the tool unavailable."""
    for env_var in code_module.REQUIRED_DAYTONA_ENV_VARS:
        monkeypatch.delenv(env_var, raising=False)

    result = await code_module.run_code(None, "print('hello')")

    assert result.status == "error"
    assert result.stdout == ""
    assert "Code interpreter is unavailable" in result.stderr
    assert "DAYTONA_API_KEY" in result.stderr
    assert "DAYTONA_API_URL" in result.stderr
    assert "DAYTONA_TARGET" in result.stderr


@pytest.mark.asyncio
async def test_run_code_returns_stdout_on_success(monkeypatch):
    """Successful execution should expose stdout and a success status."""
    for env_var in code_module.REQUIRED_DAYTONA_ENV_VARS:
        monkeypatch.setenv(env_var, "configured")

    manager = FakeSandboxManager(FakeResponse(stdout="4\n", exit_code=0))
    monkeypatch.setattr(code_module, "DaytonaSandboxManager", lambda: manager)

    result = await code_module.run_code(None, "print(2 + 2)")

    assert result.status == "success"
    assert result.stdout == "4\n"
    assert result.stderr == ""
    assert manager.create_calls == 1
    assert manager.sandbox.process.calls == [("print(2 + 2)", code_module.CODE_RUN_TIMEOUT_SECONDS)]
    assert manager.sandbox.delete_calls == [code_module.CODE_RUN_TIMEOUT_SECONDS]


@pytest.mark.asyncio
async def test_run_code_returns_error_when_execution_fails(monkeypatch):
    """Non-zero exit codes should map to an error result."""
    for env_var in code_module.REQUIRED_DAYTONA_ENV_VARS:
        monkeypatch.setenv(env_var, "configured")

    manager = FakeSandboxManager(FakeResponse(result="boom", exit_code=1))
    monkeypatch.setattr(code_module, "DaytonaSandboxManager", lambda: manager)

    result = await code_module.run_code(None, "raise RuntimeError('boom')")

    assert result.status == "error"
    assert result.stdout == "boom"
    assert result.stderr == "boom"
    assert manager.sandbox.delete_calls == [code_module.CODE_RUN_TIMEOUT_SECONDS]


@pytest.mark.asyncio
async def test_run_code_deletes_sandbox_when_runtime_raises(monkeypatch):
    """Sandbox cleanup should still run when execution raises unexpectedly."""
    for env_var in code_module.REQUIRED_DAYTONA_ENV_VARS:
        monkeypatch.setenv(env_var, "configured")

    manager = FakeSandboxManager(RuntimeError("network failure"))
    monkeypatch.setattr(code_module, "DaytonaSandboxManager", lambda: manager)

    result = await code_module.run_code(None, "print('hello')")

    assert result.status == "error"
    assert "network failure" in result.stderr
    assert manager.sandbox.delete_calls == [code_module.CODE_RUN_TIMEOUT_SECONDS]
