"""Topic Illustrator Agent to find and describe images for a given topic."""
from agents import ModelSettings, Tool, function_tool

from topix.agents.base import BaseAgent
from topix.agents.datatypes.image import ImageSearchOption
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import ImageDescriptionOutput, TopicIllustratorOutput
from topix.agents.image.describe import describe_images
from topix.agents.image.search import search_linkup, search_serper
from topix.datatypes.recurrence import Recurrence


class TopicIllustrator(BaseAgent):
    """Agent to illustrate topics with relevant images."""

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "image/topic_illustrator.jinja",
        model_settings: ModelSettings | None = None,
        image_search_engine: ImageSearchOption = ImageSearchOption.SERPER,
        image_search_num_results: int = 4
    ):
        """Initialize the TopicIllustrator agent."""
        name = "Topic Illustrator"
        self._image_search_engine = image_search_engine
        self._image_search_num_results = image_search_num_results

        instructions = self._render_prompt(instructions_template)
        tools = self._configure_tools()

        if model_settings is None:
            model_settings = ModelSettings(temperature=0.01)

        super().__init__(
            name=name,
            model=model,
            model_settings=model_settings,
            instructions=instructions,
            tools=tools,
            output_type=TopicIllustratorOutput,
        )

        super().__post_init__()

    def _configure_tools(
        self,
    ) -> list[Tool]:
        """Configure tools based on the image search engine."""
        @function_tool
        async def image_search(
            query: str,
            recency: Recurrence | None = None,
        ) -> list[tuple[str, ImageDescriptionOutput]]:
            """Search for images that are relevant to the query.

            Args:
                query: The string topic input.
                recency: The recency of the image search results.

            Returns:
                A list of tuples containing the image url, along with their descriptions.

            """
            if self._image_search_engine == ImageSearchOption.SERPER:
                image_urls = await search_serper(
                    query,
                    recency=recency,
                    num_results=self._image_search_num_results
                )
            elif self._image_search_engine == ImageSearchOption.LINKUP:
                image_urls = await search_linkup(
                    query,
                    recency=recency,
                    num_results=self._image_search_num_results
                )
            else:
                raise ValueError(f"Unsupported image search engine: {self.image_search_engine}")

            descriptions = await describe_images(image_urls)
            return [
                (url, description)
                for url, description in zip(image_urls, descriptions)
                if description is not None
            ]

        return [image_search]
