"""Answer Reformulation Agent."""

from agents import ModelSettings
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.stream import AgentStreamMessage, Content, ContentType
from topix.agents.datatypes.tools import AgentToolName


class AnswerReformulate(BaseAgent[str]):
    """Answer reformulate tool."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O,
        instructions_template: str = "answer_reformulation.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Init method."""
        name = "Answer Reformulate"
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

    async def _input_formatter(
        self, context: ReasoningContext, input: str
    ) -> list[dict[str, str]]:
        """Format the input for the answer reformulation agent."""
        kb_search_results = (
            "\n\n".join(context.kb_search_results) if context.kb_search_results else ""
        )
        web_search_results = (
            "\n\n".join(context.web_search_results)
            if context.web_search_results
            else ""
        )
        prompt = self._render_prompt(
            "answer_reformulation.user.jinja",
            query=input,
            web_search_results=web_search_results,
            kb_search_results=kb_search_results,
        )
        if context.chat_history:
            return context.chat_history + [{"role": "user", "content": prompt}]
        else:
            return [{"role": "user", "content": prompt}]

    async def _as_tool_hook(
        self, context: ReasoningContext, input: str, tool_id: str
    ) -> str | None:
        # No need to launch the answer_reformulate if there is only one search result
        if len(context.kb_search_results) == 0 and len(context.web_search_results) == 1:
            await context._message_queue.put(
                AgentStreamMessage(
                    tool_id=tool_id,
                    tool_name=AgentToolName.ANSWER_REFORMULATE,
                    content=Content(
                        type=ContentType.MESSAGE,
                        text=context.web_search_results[0],
                    ),
                    is_stop=True,
                )
            )
            return context.web_search_results[0]
        return None
