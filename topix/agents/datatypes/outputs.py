"""Agent Output Data Types."""
from pydantic import BaseModel

type ToolOutput = str | CodeInterpreterOutput


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
