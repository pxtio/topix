"""Primitive code execution tool backed by Daytona sandboxes."""

import asyncio
import contextlib
import logging
import os
import time

from typing import Literal

from agents import RunContextWrapper
from daytona import (
    AsyncDaytona,
    CreateSandboxFromImageParams,
    CreateSandboxFromSnapshotParams,
    Image,
)

from topix.agents.datatypes.context import Context
from topix.agents.datatypes.outputs import CodeInterpreterOutput
from topix.agents.datatypes.tools import AgentToolName, tool_descriptions
from topix.agents.tool_handler import ToolHandler

logger = logging.getLogger(__name__)

MAX_CONCURRENT_CODE_RUNS = int(os.getenv("CODE_INTERPRETER_MAX_CONCURRENT_RUNS", "10"))
CODE_RUN_TIMEOUT_SECONDS = int(os.getenv("CODE_INTERPRETER_TIMEOUT_SECONDS", "60"))
CODE_RUN_SEMAPHORE = asyncio.Semaphore(MAX_CONCURRENT_CODE_RUNS)
REQUIRED_DAYTONA_ENV_VARS = (
    "DAYTONA_API_KEY",
    "DAYTONA_API_URL",
    "DAYTONA_TARGET",
)


class DaytonaSandboxManager:
    """Create and tear down a Daytona sandbox for a single code execution."""

    def __init__(self):
        """Initialize the sandbox manager with environment-backed defaults."""
        self._client = AsyncDaytona()
        self._image = os.getenv("DAYTONA_IMAGE")
        self._snapshot = os.getenv("DAYTONA_SNAPSHOT")

    async def create(self):
        """Create a sandbox for the current execution."""
        if self._snapshot:
            params = CreateSandboxFromSnapshotParams(
                language="python",
                snapshot=self._snapshot,
            )
            return await self._client.create(params)

        if self._image:
            params = CreateSandboxFromImageParams(
                language="python",
                image=self._image,
            )
            return await self._client.create(params)

        params = CreateSandboxFromImageParams(
            language="python",
            image=Image.debian_slim("3.13"),
        )
        return await self._client.create(params)

    async def destroy(self, sandbox: object) -> None:
        """Destroy the sandbox after execution completes."""
        await sandbox.delete(timeout=CODE_RUN_TIMEOUT_SECONDS)

    async def run_code(self, sandbox: object, code: str) -> tuple[str, str]:
        """Execute Python code inside the sandbox and capture stdio."""
        response = await sandbox.process.code_run(
            code,
            timeout=CODE_RUN_TIMEOUT_SECONDS,
        )
        artifacts = getattr(response, "artifacts", None)
        stdout = getattr(artifacts, "stdout", "") or getattr(response, "result", "") or ""
        stderr = ""
        if getattr(response, "exit_code", 0) != 0:
            stderr = getattr(response, "result", "") or "Execution failed."
        return stdout, stderr


def _derive_status(stderr: str, timed_out: bool) -> Literal["success", "error", "timeout"]:
    """Map execution signals into the public tool status."""
    if timed_out:
        return "timeout"
    if stderr.strip():
        return "error"
    return "success"


def _get_missing_daytona_env_vars() -> list[str]:
    """Return the Daytona env vars required to enable the tool but currently unset."""
    return [name for name in REQUIRED_DAYTONA_ENV_VARS if not os.getenv(name)]


async def run_code(
    _wrapper: RunContextWrapper[Context],
    code: str,
) -> CodeInterpreterOutput:
    """Run Python code in a short-lived Daytona sandbox with strict cleanup."""
    started_at = time.perf_counter()
    missing_env_vars = _get_missing_daytona_env_vars()

    if missing_env_vars:
        return CodeInterpreterOutput(
            status="error",
            stdout="",
            stderr=(
                "Code interpreter is unavailable because Daytona is not fully configured. "
                f"Missing env vars: {', '.join(missing_env_vars)}"
            ),
            duration_ms=int((time.perf_counter() - started_at) * 1000),
        )

    sandbox_manager = DaytonaSandboxManager()
    sandbox = None
    stdout = ""
    stderr = ""

    async with CODE_RUN_SEMAPHORE:
        try:
            sandbox = await sandbox_manager.create()
            stdout, stderr = await sandbox_manager.run_code(sandbox, code)
        except TimeoutError:
            stderr = (
                f"Execution exceeded the {CODE_RUN_TIMEOUT_SECONDS}s limit and was stopped."
            )
        except Exception as exc:
            logger.exception("Code execution failed")
            stderr = str(exc)
        finally:
            if sandbox is not None:
                with contextlib.suppress(Exception):
                    await sandbox_manager.destroy(sandbox)

    duration_ms = int((time.perf_counter() - started_at) * 1000)

    return CodeInterpreterOutput(
        status=_derive_status(stderr=stderr, timed_out=False),
        stdout=stdout,
        stderr=stderr,
        duration_ms=duration_ms,
    )


run_code_tool = ToolHandler.convert_func_to_tool(
    run_code,
    tool_name=AgentToolName.CODE_INTERPRETER,
    tool_description=tool_descriptions.get(AgentToolName.CODE_INTERPRETER, ""),
)
