"""Answer Reformulation Agent."""

from agents import ModelSettings

from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum


class AnswerReformulate(BaseAgent):
    """Answer reformulate tool."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4_1,
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
        input_items = context.chat_history
        tool_calls = context.tool_calls
        tool_trace = ""

        for idx, tool_call in enumerate(tool_calls):
            tool_step = f"""Step {idx + 1}: Calling {tool_call.name}
                - Arguments: {tool_call.arguments}
                - Output: {str(tool_call.output)} \n\n
            """
            tool_trace += tool_step

        prompt = self._render_prompt(
            "answer_reformulation.user.jinja",
            query=input,
            tool_trace=tool_trace,
        )

        return input_items + [{"role": "user", "content": prompt}]
