"""Agent Output Data Types."""
from typing import Literal

from pydantic import BaseModel

from topix.agents.datatypes.annotations import (
    FileAnnotation,
    RefAnnotation,
    SearchResult,
)

type ToolOutput = str | CodeInterpreterOutput | WebSearchOutput | MemorySearchOutput


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
