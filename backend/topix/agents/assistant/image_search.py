import asyncio
import json
import logging
import os
from typing import Any, Literal

import requests

from topix.agents.datatypes.context import ReasoningContext
from topix.agents.run import AgentRunner
from pydantic import BaseModel
from openai import AsyncOpenAI
from agents import Agent, Tool, function_tool, ModelSettings, AgentHooks, RunContextWrapper
from topix.agents.base import BaseAgent
from topix.agents.datatypes.model_enum import ModelEnum


class ImageSearchOutput(BaseModel):
    """Output of the image search agent."""
    image_url: str
    image_title: str
    image_description: str


class ImageSearchAgentHook(AgentHooks):
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


class ImageSearch(BaseAgent):

    def __init__(
        self,
        model: str = ModelEnum.OpenAI.GPT_4O_MINI,
        instructions_template: str = "image_search.jinja",
        model_settings: ModelSettings | None = None,
    ):
        """Initialize the ImageSearch agent."""
        name = "Image Search"

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
            output_type=ImageSearchOutput,
            hooks=ImageSearchAgentHook(),
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
            return await full_image_search(query)

        return [image_search]


def search_serper(
    query: str,
    num_results: int = 4,
    time_range: Literal["d", "w", "m", "y"] = "y",
    location: str = "fr",
) -> list[str]:
    """Search the serper API for images based on the query.

    Args:
        query: The query to search for.
        num_results: The number of results to return.
        time_range: The time range to search for.
        location: The location of the search.

    Returns:
        return a list of image urls.
    """
    url = "https://google.serper.dev/images"
    payload = json.dumps({
        "q": query,
        "num": num_results,
        "tbs": f"qdr:{time_range}",
        "gl": location
    })
    headers = {
        'X-API-KEY': os.environ.get("SERPER_API_KEY"),
        'Content-Type': 'application/json'
    }
    logging.info(f"Searching for images with query: {query}")
    response = requests.request("POST", url, headers=headers, data=payload)
    response.raise_for_status()

    json_response = response.json()
    logging.info(f"Found {len(json_response['images'])} images")
    return [item["imageUrl"] for item in json_response["images"]]


def search_linkup(
    query: str,
) -> dict:
    """Search for a query using the LinkUp API.

    Args:
        query (str): The query to search for.
        max_results (int): The maximum number of results to return. Default is 20.
        search_context_size (str): The size of the search context. Default is "medium".

    Returns:
        WebSearchOutput: The results of the search.
    """
    url = "https://api.linkup.so/v1/search"
    api_key = os.environ.get("LINKUP_API_KEY")
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    search_depth = "standard"

    data = {
        "q": query,
        "outputType": "searchResults",
        "depth": search_depth,
        "includeImages": True,
    }
    response = requests.post(url, headers=headers, json=data)
    response.raise_for_status()

    json_response = response.json()

    results = json_response.get("results", [])
    urls = [result.get("imageUrl") for result in results if result.get("type") == "image"]

    return urls


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
        print(e)
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


async def full_image_search(query: str) -> list[tuple[str, ImageDescription]]:
    """Search for images that are relevant to the query,
    and return a description of the images along with the urls."""
    image_urls = search_linkup(query)
    # image_urls = search_serper(query, num_results=4, time_range="y", location="fr")
    logging.info(f"Image urls: {image_urls}")
    descriptions = await image_descriptor(image_urls)
    logging.info(f"Found {len(descriptions)} descriptions")
    return [(url, description) for url, description in zip(image_urls, descriptions) if description is not None]


async def run_agent():
    agent = ImageSearch()
    result = await AgentRunner.run(agent, "Voiture moteur")
    print(result)

if __name__ == "__main__":
    asyncio.run(full_image_search("Voiture moteur"))
