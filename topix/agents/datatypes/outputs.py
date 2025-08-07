"""Agent Output Data Types."""
from pydantic import BaseModel

type ToolOutput = str | WebSearchOutput | CodeInterpreterOutput


class SearchResult(BaseModel):
    """Search result from web search tool."""

    title: str
    url: str
    content: str


class FileAnnotation(BaseModel):
    """Annotation of a generated file."""

    type: str
    url: str
    file_id: str


class WebSearchOutput(BaseModel):
    """Output from web search tool."""

    answer: str
    search_results: list[SearchResult]

    def __str__(self) -> str:
        """To string method."""
        return self.answer


class CodeInterpreterOutput(BaseModel):
    """Output from code interpreter tool."""

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
                result += f"- [{annotation.file_id}]({annotation.url})\n"
        return result
