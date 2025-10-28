import asyncio
import logging
import os
from typing import Any, Literal


from topix.agents.datatypes.context import ReasoningContext
from topix.agents.run import AgentRunner
from pydantic import BaseModel
from openai import AsyncOpenAI
from agents import Agent, Tool, function_tool, ModelSettings, AgentHooks, RunContextWrapper
from topix.agents.base import BaseAgent, Context
from topix.agents.datatypes.model_enum import ModelEnum
from topix.agents.datatypes.outputs import ImageIllustratorOutput

from topix.agents.image.search import search_linkup, search_serper


class ImageIllustratorAgentHook(AgentHooks):
    """Custom hook to handle the context and results of the image search agent."""

    async def on_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        output: Any,
    ):
        """Initialize the context for the image search agent."""
        # Initialize the context if not already done
        for tool in agent.tools:
            tool.is_enabled = True

    async def on_tool_end(
        self,
        context: RunContextWrapper[ReasoningContext],
        agent: Agent[ReasoningContext],
        tool: Tool,
        result: str,
    ):
        """Handle tool calls and update the context with the results."""
        tool.is_enabled = False


class TopicIllustrator(BaseAgent):

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "topic_illustrator.jinja",
        model_settings: ModelSettings | None = None,
        image_search_engine: Literal["serper", "linkup"] = "serper",
        language: Literal["en", "fr"] = "fr",
    ):
        """Initialize the TopicIllustrator agent."""
        name = "Topic Illustrator"
        self.image_search_engine = image_search_engine
        self.language = language

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
            output_type=ImageIllustratorOutput,
            hooks=ImageIllustratorAgentHook(),
        )

        super().__post_init__()

    def _configure_tools(
        self,
    ) -> list[Tool]:
        """Configure tools based on image search."""
        @function_tool
        async def image_search(query: str) -> list[tuple[str, ImageDescription]]:
            """Search for images that are relevant to the query,
            and return a description of the images along with their urls."""
            if self.image_search_engine == "serper":
                image_urls = search_serper(query, num_results=4, time_range="y", location="us")
            elif self.image_search_engine == "linkup":
                image_urls = search_linkup(query, num_results=4)
            else:
                raise ValueError(f"Invalid image search engine: {self.image_search_engine}")
            descriptions = await image_descriptor(image_urls)
            return [
                (url, description)
                for url, description in zip(image_urls, descriptions)
                if description is not None
            ]

        return [image_search]


class TextMessageContent(BaseModel):
    type: Literal['text'] = 'text'
    text: str


class ImageUrl(BaseModel):
    url: str
    detail: Literal['low', 'high'] = 'low'


class ImageMessageContent(BaseModel):
    type: Literal['image_url'] = 'image_url'
    image_url: ImageUrl


class ChatMessage(BaseModel):
    """Message model for an LLM chat model"""
    role: Literal['user', 'assistant', 'system'] = 'user'
    content: str | list[TextMessageContent | ImageMessageContent]

    @classmethod
    def from_str(cls, content: str) -> 'ChatMessage':
        return cls(content=content)


class ImageDescription(BaseModel):
    image_title: str
    image_type: str
    image_summary: str


async def process_message(client: AsyncOpenAI, message: ChatMessage) -> ImageDescription | None:
    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[message.model_dump()],
            response_format=ImageDescription
        )
        result = response.choices[0].message.content
        return result
    except Exception as e:
        logging.error(f"Error processing message: {e}", exc_info=True)
        return None


async def image_descriptor(image_urls: list[str]) -> list[ImageDescription]:
    """Compute a description of each image."""
    client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

    def input_handler(image_url: str, detail: str = 'low') -> ChatMessage:
        """ Format the input """
        text = BaseAgent._render_prompt("image_description.jinja")
        message = ChatMessage(
            content=[
                TextMessageContent(text=text),
                ImageMessageContent(image_url=ImageUrl(url=image_url, detail=detail))
            ]
        )
        return message

    logging.info(f"Processing {len(image_urls)} images")
    message_collection = [input_handler(image_url) for image_url in image_urls]
    descriptions = await asyncio.gather(*[process_message(client, message) for message in message_collection])
    logging.info(f"Processed {len(descriptions)} images")
    logging.info(f"Descriptions: {descriptions}")
    return descriptions


async def image_search(query: str) -> list[tuple[str, ImageDescription]]:
    """Search for images that are relevant to the query,
    and return a description of the images along with the urls."""
    # image_urls = search_linkup(query)
    image_urls = search_serper(query, num_results=4, time_range="y", location="us")
    logging.info(f"Image urls: {image_urls}")
    descriptions = await image_descriptor(image_urls)
    logging.info(f"Found {len(descriptions)} descriptions")
    return [(url, description) for url, description in zip(image_urls, descriptions) if description is not None]


async def run_agent():
    agent = TopicIllustrator()
    result = await AgentRunner.run(agent, "Voiture moteur", context=Context())
    print(result)

if __name__ == "__main__":
    asyncio.run(run_agent())
