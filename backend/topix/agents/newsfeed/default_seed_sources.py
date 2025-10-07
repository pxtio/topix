"""Default seed sources for some domains."""


from pydantic import BaseModel


class NewsfeedField(BaseModel):
    """Newsfeed field with default seed sources."""

    name: str
    seed_sources: list[str]


class DefaultSeedSources(BaseModel):
    """Default seed sources for some domains."""

    ai: NewsfeedField = NewsfeedField(
        name="Artificial Intelligence",
        seed_sources=[
            # Frontier labs
            "openai.com/blog",
            "developers.openai.com/blog",
            "ai.googleblog.com",
            "deepmind.google/discover",
            "anthropic.com/news",
            "ai.meta.com/blog",
            "mistral.ai/news",
            "cohere.com/blog",
            "ai21.com/blog",
            "voyageai.com/blog",
            "perplexity.ai/blog",
            "stability.ai/news",
            "x.ai/blog",
            "mlcommons.org/insights",
            "openllm-leaderboard.com",
            "blogs.nvidia.com/",
            "microsoft.com/en-us/research",
            "techcrunch.com/tag/artificial-intelligence",
            "venturebeat.com/ai",
            "nature.com/subjects/computer-science"

            # OSS / research
            "huggingface.co/blog",
            "huggingface.co/papers",
            "arxiv.org",
            "paperswithcode.com",
            "eleuther.ai/news",
            "together.ai/blog",

            # Benchmarks / infra
            "mlcommons.org/en/news",
            "blog.langchain.dev",
            "llamaindex.ai/blog",
            "milvus.io/blog",
            "developer.nvidia.com/blog",
            "pinecone.io/blog",
            "weaviate.io/blog",
            "scale.com/blog",
            "lightning.ai/blog",
            "runwayml.com/blog"
        ]
    )
    technology: NewsfeedField = NewsfeedField(
        name="Technology",
        seed_sources=[
            "aws.amazon.com/blogs/aws",
            "blogs.microsoft.com",
            "apple.com/newsroom",
            "blog.google",
            "blog.cloudflare.com",
            "azure.microsoft.com/updates",
            "developer.apple.com/news",
            "nvidianews.nvidia.com",
            "developer.nvidia.com/blog",
            "github.blog",
            "chromereleases.googleblog.com",
            "android-developers.googleblog.com",
            "w3.org/blog/news",
            "ietf.org/blog",
            "hacks.mozilla.org",
            "newsroom.cisco.com",
            "oracle.com/news"
        ]
    )
    finance: NewsfeedField = NewsfeedField(
        name="Finance",
        seed_sources=[
            "federalreserve.gov/newsevents/pressreleases.htm",
            "sec.gov/news/press",
            "ecb.europa.eu/press",
            "home.treasury.gov/news/press-releases",
            "bea.gov/news",
            "bls.gov/news.release",
            "ec.europa.eu/eurostat/news",
            "oecd.org/newsroom",
            "bis.org/press",
            "esma.europa.eu/press-news",
            "fca.org.uk/news",
            "finra.org/newsroom",
            "worldbank.org/en/news",
            "imf.org/en/News",
            "nyse.com/markets/notices",
            "nasdaq.com/press-releases"
        ]
    )
    health: NewsfeedField = NewsfeedField(
        name="Health",
        seed_sources=[
            "who.int/news",
            "fda.gov/news-events/press-announcements",
            "ema.europa.eu/en/news",
            "cdc.gov/media/releases",
            "nih.gov/news-events",
            "clinicaltrials.gov/about-site/news-and-updates",
            "medrxiv.org",
            "biorxiv.org",
            "nejm.org",
            "thelancet.com/press",
            "jamanetwork.com",
            "gov.uk/government/organisations/mhra",
            "nice.org.uk/news",
            "ecdc.europa.eu/en/news-events"
        ]
    )
    climate: NewsfeedField = NewsfeedField(
        name="Climate",
        seed_sources=[
            "ipcc.ch",
            "climate.gov/news",
            "climate.nasa.gov/news",
            "wmo.int/news",
            "nhc.noaa.gov",
            "emergency.copernicus.eu/mapping",
            "climate.copernicus.eu/news",
            "ecmwf.int",
            "earthquake.usgs.gov",
            "emsc-csem.org",
            "gdacs.org",
            "reliefweb.int",
            "metoffice.gov.uk",
            "jma.go.jp"
        ]
    )
