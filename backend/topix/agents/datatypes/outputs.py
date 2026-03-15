"""Agent Output Data Types."""
from __future__ import annotations

from typing import Annotated, Literal, Union

from pydantic import BaseModel

from topix.agents.datatypes.annotations import (
    RefAnnotation,
    SearchResult,
)
from topix.agents.datatypes.drawn_graph import DrawnGraph
from topix.agents.mindmap.schemify.datatypes import SchemaOutput
from topix.datatypes.note.style import NodeType


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


class TranslateOutput(BaseModel):
    """Translate Output."""

    text: str


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
    status: Literal["success", "error", "timeout"]
    stdout: str = ""
    stderr: str = ""
    duration_ms: int

    def __str__(self) -> str:
        """To string method."""
        result = f"Execution status: {self.status}\nDuration: {self.duration_ms}ms"

        if self.stdout:
            result += f"\n\nstdout:\n{self.stdout}"

        if self.stderr:
            result += f"\n\nstderr:\n{self.stderr}"

        return result


class CreateNoteOutput(BaseModel):
    """Output from create note tool."""

    type: Literal["create_note"] = "create_note"
    note_id: Annotated[str, "The unique id of the created note."]
    graph_uid: Annotated[str, "The board id where the note was created."]
    label: Annotated[str, "The note label stored on the created note."]
    note_type: Annotated[NodeType, "The final node type used for the created note."]
    parent_id: Annotated[
        str | None,
        "The folder/root note id used as the created note parent, if any."
    ] = None


class EditNoteOutput(BaseModel):
    """Output from edit note tool."""

    type: Literal["edit_note"] = "edit_note"
    note_id: Annotated[str, "The unique id of the edited note."]
    graph_uid: Annotated[str, "The board id where the note belongs."]
    label: Annotated[str, "The note label after the edit is applied."]
    note_type: Annotated[NodeType, "The final node type after the edit."]
    parent_id: Annotated[
        str | None,
        "The parent folder/root note id after the edit, if any."
    ] = None


class MemorySearchOutput(BaseModel):
    """Output from memory search tool."""

    type: Literal["memory_search"] = "memory_search"
    answer: str = ""
    references: list[RefAnnotation] = []

    def __str__(self) -> str:
        """To string method."""
        if self.answer:
            return self.answer

        # TODO: Voir pr document_label plus tard
        formatted = "Memory search Results:\n\n"
        for reference in self.references:
            if reference.label or reference.content:
                note_id = reference.ref_id
                url = f"/{reference.ref_type}/{note_id[:5]}"
                formatted += f"\n<Source\n  id=\"{note_id}\"\n  url=\"{url}\""
                if reference.label:
                    formatted += f"\n  label=\"{reference.label}\""
                formatted += (
                    f"\n  type=\"{reference.ref_type}\""
                    "\n>"
                    f"\n{reference.content or ""}\n"
                    "\n</Source>\n"
                )
        return formatted


class ImageGenerationOutput(BaseModel):
    """Output from image generation tool."""

    type: Literal["image_generation"] = "image_generation"
    image_urls: list[str] = []


type ToolOutput = Union[
    str,
    CodeInterpreterOutput,
    CreateNoteOutput,
    EditNoteOutput,
    WebSearchOutput,
    MemorySearchOutput,
    NotifyOutput,
    MapifyTheme,
    TopicTracker,
    NewsfeedOutput,
    SchemaOutput,
    TranslateOutput,
    TopicIllustratorOutput,
    ImageDescriptionOutput,
    DisplayStockWidgetOutput,
    DisplayWeatherWidgetOutput,
    DisplayImageSearchWidgetOutput,
    ImageGenerationOutput,
    DrawnGraph,
]
