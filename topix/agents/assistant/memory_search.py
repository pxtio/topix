"""Memory Search Agent."""

import re

from agents import ModelSettings, RunResult
from topix.agents.base import BaseAgent
from topix.agents.config import BaseAgentConfig
from topix.agents.datatypes.annotations import RefAnnotation
from topix.agents.datatypes.context import ReasoningContext
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import MemorySearchOutput
from topix.store.qdrant.store import ContentStore

NOT_FOUND = "No more relevant information found in the memory base."


class MemorySearch(BaseAgent):
    """Memory Search Agent."""

    def __init__(
        self,
        content_store: ContentStore,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "memory_search.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the MemorySearch agent."""
        name = "Memory Search"

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=self._render_prompt(instructions_template),
        )

        self.content_store = content_store

    @classmethod
    def from_config(cls, content_store: ContentStore, config: BaseAgentConfig):
        """Create an instance of MemorySearch from configuration."""
        return cls(
            content_store=content_store,
            model=config.model,
            instructions_template=config.instructions_template,
            model_settings=config.model_settings,
        )

    async def _input_formatter(self, context: ReasoningContext, input: str) -> str:
        # search from the memory base, and return the related memories
        results = await self.content_store.search(
            query=input,
            limit=context.memory_search_limit,
            include={"type": True, "content": True, "label": True},
            filter=context.memory_search_filter,
        )

        memories = []
        for result in results:
            resource = result.resource
            if resource.id in context._memory_cache:
                continue
            context._memory_cache.add(resource.id)
            content = resource.content.markdown
            short_id = resource.id[:4]
            memory = f'<CONTEXT url="{short_id}" type="{resource.type}"> \
                \n{content}\n</CONTEXT>'
            memories.append(memory)

        if not memories:
            return ""

        return f"""
        <user_query>
        {input}
        </user_query>

        <documents>
        {"\n\n".join(memories)}
        </documents>
        """

    async def _as_tool_hook(
        self, context: ReasoningContext, input: str, tool_id: str
    ) -> str:
        # No memory extracted from the memory base
        if not input:
            return NOT_FOUND

    async def _output_extractor(
        self,
        context: ReasoningContext,
        output: RunResult,
    ) -> MemorySearchOutput:
        final_output: str = output.final_output

        # Extract the cited url in format [type](url)
        pattern = r'\[([^\]]+)\]\(([0-9a-fA-F]{4})\)'
        matches = re.findall(pattern, final_output)

        if not matches:
            # No relevant information found
            return MemorySearchOutput(answer=NOT_FOUND)

        id_map = {idx[:4]: idx for idx in context._memory_cache}
        ref_ids = []

        def _replace_link(match):
            _, short_id = match.groups()
            long_id = id_map.get(short_id, None)
            if long_id is not None:
                ref_ids.append(RefAnnotation(ref_id=long_id))

        rewritten = re.sub(pattern, _replace_link, final_output)

        return MemorySearchOutput(answer=rewritten, references=ref_ids)
