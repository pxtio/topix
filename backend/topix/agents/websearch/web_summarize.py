"""Web Summarize Agent."""


from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum


class WebSummarize(BaseAgent):
    """Web Summarize Agent summarizing searched raw content."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
        instructions_template: str = "web_summarize.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the WebSearch agent."""
        name = "Web Summarize"

        instructions = self._render_prompt(instructions_template)

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
        )

        super().__post_init__()
