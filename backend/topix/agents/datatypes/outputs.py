"""Agent Output Data Types."""
from __future__ import annotations

from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.annotations import (
    FileAnnotation,
    RefAnnotation,
    SearchResult,
)

type ToolOutput = str | CodeInterpreterOutput | WebSearchOutput | MemorySearchOutput | NotifyOutput | MapifyTheme | TopicTracker | NewsfeedOutput | ImageIllustratorOutput


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
                formatted += f"""<document url=/{result.url}/ title="{result.title}">
                {result.content}
                </document>\n\n"""
            return formatted
        else:
            """The final output of the Websearch Agent."""
            return self.answer


class ImageIllustratorOutput(BaseModel):
    """Output of the image illustrator agent."""
    image_url: str
    image_title: str
    image_description: str


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
