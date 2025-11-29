"""Agent Output Data Types."""
from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel

from topix.agents.datatypes.annotations import (
    FileAnnotation,
    RefAnnotation,
    SearchResult,
)
from topix.agents.mindmap.schemify.datatypes import SchemaOutput

type ToolOutput = Union[
    str,
    CodeInterpreterOutput,
    WebSearchOutput,
    MemorySearchOutput,
    NotifyOutput,
    MapifyTheme,
    TopicTracker,
    NewsfeedOutput,
    SchemaOutput,
    TopicIllustratorOutput,
    ImageDescriptionOutput,
    DisplayStockWidgetOutput,
    DisplayWeatherWidgetOutput,
    DisplayImageSearchWidgetOutput,
    ImageGenerationOutput,
]


class DisplayWeatherWidgetOutput(BaseModel):
    """Display Weather Widget Output."""

    type: Literal["display_weather_widget"] = "display_weather_widget"
    city: Annotated[
        str,
        "Free-form place description for geocoding. "
        "Include country or state to disambiguate when possible. "
        "Examples: 'Paris, France', 'Austin, TX, USA', 'Bangalore, IN', "
        "'Shibuya, Tokyo, Japan'. Can also be a neighborhood or landmark "
        "like 'Manhattan, New York, USA'."
    ]


class DisplayStockWidgetOutput(BaseModel):
    """Display Stock Widget Output."""

    type: Literal["display_stock_widget"] = "display_stock_widget"
    symbol: Annotated[str, "The stock ticker symbol, e.g. AAPL for Apple Inc."]


class DisplayImageSearchWidgetOutput(BaseModel):
    """Display Image Search Widget Output."""

    type: Literal["display_image_search_widget"] = "display_image_search_widget"
    query: Annotated[
        str,
        "The search query for finding relevant images to display in the widget."
    ]
    images: Annotated[
        list[str],
        "List of image URLs returned from the image search. Should be left empty. This will be populated by the frontend."
    ] = []


class NewsfeedArticle(BaseModel):
    """Newsfeed article data model."""

    title: str
    url: str
    summary: str
    published_at: str
    source_domain: str
    score: int | None = None
    tags: list[str] = []


class NewsfeedSection(BaseModel):
    """Newsfeed section data model."""

    title: str
    articles: list[NewsfeedArticle]


class NewsfeedOutput(BaseModel):
    """Newsfeed output data model."""

    sections: list[NewsfeedSection]


class TopicTracker(BaseModel):
    """Topic data model."""

    description: str
    sub_topics: list[str]
    keywords: list[str]
    seed_sources: list[str]


class MapifyTheme(BaseModel):
    """Theme."""

    label: str
    description: str
    subthemes: list[MapifyTheme] = []


class NotifyOutput(BaseModel):
    """Notify Output."""

    title: str
    content: str


class ImageDescriptionOutput(BaseModel):
    """Output of the image description agent."""

    image_title: str
    image_type: str
    image_summary: str


class TopicIllustratorOutput(BaseModel):
    """Output of the topic illustrator agent."""

    image_url: str
    image_title: str
    image_description: str


class WebSearchOutput(BaseModel):
    """Output from web search tool."""

    type: Literal["web_search"] = "web_search"
    answer: str = ""
    search_results: list[SearchResult]

    def __str__(self) -> str:
        """Convert output to string."""
        if not self.answer:
            # raw search results
            formatted = "Search Results:\n\n"
            for result in self.search_results:
                formatted += (
                    "\n<Source"
                    f"\n  url=\"{result.url}\""
                    f"\n  title=\"{result.title}\""
                    "\n>"
                    f"\n{result.content}\n"
                    "\n</Source>\n"
                )
            return formatted
        else:
            """The final output of the Websearch Agent."""
            return self.answer


class CodeInterpreterOutput(BaseModel):
    """Output from code interpreter tool."""

    type: Literal["code_interpreter"] = "code_interpreter"
    answer: str
    executed_code: str
    annotations: list[FileAnnotation]

    def __str__(self) -> str:
        """To string method."""
        result = f"I executed the following code:\n```\n{self.executed_code}\n```\n"

        result += f"The result was: {self.answer}"

        if self.annotations:
            result += "\n\nGenerated files:\n"
            for annotation in self.annotations:
                result += annotation.model_dump_json() + "\n"
        return result


class MemorySearchOutput(BaseModel):
    """Output from memory search tool."""

    type: Literal["memory_search"] = "memory_search"
    answer: str
    references: list[RefAnnotation] = []

    def __str__(self) -> str:
        """To string method."""
        return self.answer


class ImageGenerationOutput(BaseModel):
    """Output from image generation tool."""

    type: Literal["image_generation"] = "image_generation"
    image_urls: list[str] = []
