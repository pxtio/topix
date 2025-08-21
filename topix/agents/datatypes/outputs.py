"""Agent Output Data Types."""
from pydantic import BaseModel


class SearchResult(BaseModel):
    """Search result from a web search tool."""

    url: str
    title: str | None = None
    content: str | None = None


class WebSearchOutput(BaseModel):
    """Output from web search tool."""

    answer: str | None = None
    search_results: list[SearchResult]

    def __str__(self) -> str:
        """Convert output to string."""
        if self.answer is None:
            # raw search results
            formatted = "Search Results:\n\n"
            for i, result in enumerate(self.search_results, 1):
                formatted += f"{i}. **{result.title}**\n"
                formatted += f"   URL: {result.url}\n"
                formatted += f"   Content: {result.content}\n\n"
            return formatted
        else:
            """The final output of the Websearch Agent."""
            return self.answer


class FileAnnotation(BaseModel):
    """Annotation of a generated file."""

    type: str
    file_path: str
    file_id: str


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
                result += annotation.model_dump_json() + "\n"
        return result


ToolOutput = str | CodeInterpreterOutput | WebSearchOutput
