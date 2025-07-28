from agents import ModelSettings
from topix.agents.base import BaseAgent
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.inputs import QueryRewriteInput


class QueryRewrite(BaseAgent):
    """
    A manager for query decompose operations.
    This class is responsible for managing the query decompose agent and its operations.
    """

    def __init__(
        self,
        model: str,
        instructions_template: str = "query_rewrite.system.jinja",
        model_settings: ModelSettings | None = None,
    ):
        name = "Query Rewrite"
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
        self, context: ReasoningContext, input: QueryRewriteInput
    ) -> str:
        """
        Format the input for the query decomposition agent.

        Args:
            context (ReasoningContext): The agent context.
            query (str): The user's query.

        Returns:
            str: The formatted input string.
        """
        chat_history, new_query = input.chat_history, input.query
        user_prompt = self._render_prompt(
            "query_rewrite.user.jinja",
            chat_history="\n".join(
                [f"{item['role']}: {item['content']}" for item in chat_history]
            ),
            query=new_query,
        )
        return user_prompt
