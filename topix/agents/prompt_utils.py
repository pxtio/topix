"""Prompt loading functions."""

from pathlib import Path

from jinja2 import Template

PROMPT_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(filename: str) -> str:
    """Load a prompt template from the prompts directory."""
    with open(PROMPT_DIR / filename, "r", encoding="utf-8") as f:
        return f.read()


def render_prompt(filename: str, **kwargs) -> str:
    """Render a prompt template with the given parameters."""
    template_str = load_prompt(filename)
    template = Template(template_str)
    return template.render(**kwargs)
