"""Text processing utilities for agents."""
import re

MIN_MATCHES = 10


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


def post_process_url_citations(answer: str, valid_urls: list[str]) -> str:
    """Post process url citations to correct wrong urls."""
    valid_url_set = set(valid_urls)

    trie = _create_trie(valid_url_set)

    def replacer(match: re.Match) -> str:
        extracted_url = match.group(0)

        # check exact match
        if extracted_url in valid_url_set:
            return extracted_url

        # correct the url
        corrected_url = _get_valid_url(extracted_url, trie)

        if corrected_url:
            return corrected_url
        else:
            return extracted_url

    http_link_regex = r'(https?://[^\s()<>\[\]]*)'

    corrected_answer = re.sub(http_link_regex, replacer, answer)
    return corrected_answer


def _create_trie(urls: set[str]) -> dict:
    """Build a dictionary-based Trie from a list of URLs.

    Args:
        urls: A list of unique URL strings.

    Returns:
        A dictionary representing the Trie structure.

    """
    root = {}

    for url in urls:
        node = root
        for char in url:
            node: dict = node.setdefault(char, {})

        node['#END#'] = True

    return root


def _get_valid_url(url: str, trie: dict) -> str:
    """Find the most similar valid_url from trie.

    Args:
        url: The URL string to check.
        trie: The Trie dictionary.

    Returns:
        The most similar.

    """
    node = trie
    valid_url = ""

    num_matches = 0
    for char in url:
        if char in node:
            valid_url += char
            node = node[char]

            # If this node marks the end of a valid URL, update last_valid_url
            if '#END#' in node:
                return valid_url
            num_matches += 1

    if num_matches < MIN_MATCHES:
        return url

    while "#END#" not in node:
        key = next(iter(node.keys()))
        valid_url += key
        node = node[key]

    return valid_url
