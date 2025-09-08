"""Text processing utilities for agents."""
import re


def extract_final_answer(text: str) -> str:
    """Extract the final answer portion of a string.

    Extract the final answer portion of a string, after the first marker
    of the form <|F...|> or <|f...|>. Any other <|...|> markers in the
    extracted text are removed. The result is stripped of surrounding
    whitespace.

    Args:
        text: The full text output from the model.

    Returns:
        The cleaned final answer as a string. If no marker is found,
        returns the full cleaned text.

    """
    # Regex: match <| ... |> where inside starts with F or f
    first_marker = re.compile(r"<\|\s*[Ff][^|]*\|>")
    match = first_marker.search(text)

    if not match:
        # No final marker found: clean whole text
        result = text
    else:
        # Extract everything after the first marker
        start_index = match.end()
        result = text[start_index:]

    # Remove any other <|...|> markers
    result = re.sub(r"<\|[^|]*\|>", "", result)

    # Strip leading/trailing whitespace
    return result.strip()
