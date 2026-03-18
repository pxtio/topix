"""Tests for widget learning tools."""

from __future__ import annotations

import pytest

from agents import RunContextWrapper

from topix.agents.datatypes.context import Context
from topix.agents.widgets.learn import learn_generate_html_widget


@pytest.mark.asyncio
async def test_learn_generate_html_widget_returns_widget_note_guidance() -> None:
    """Widget learning tool should return prompt guidance for widget notes."""
    prompt = await learn_generate_html_widget(RunContextWrapper(Context()))

    assert "create_note" in prompt
    assert "note_type" in prompt
    assert "widget" in prompt
    assert "iframe" in prompt
    assert "visual explainer" in prompt
    assert "Chart.js" in prompt
    assert "system-ui" in prompt
    assert "rose-pine" in prompt
