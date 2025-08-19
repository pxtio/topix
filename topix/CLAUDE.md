# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TopiX is a Python-based AI agent system that provides conversational AI capabilities with knowledge base integration. It's built using FastAPI for the web API and implements a sophisticated agent-based architecture for handling user queries through planning, web search, and knowledge retrieval.

## Key Commands

### Running the Application
```bash
python -m topix.api.app --stage LOCAL --port 8888
```

### Development Setup
The application uses Doppler for configuration management. Set up your environment:
1. Configure Doppler secrets for the appropriate stage (LOCAL/DEV/PROD)
2. Ensure required API keys are set: `OPENAI_API_KEY`
3. Set up PostgreSQL and Qdrant databases as configured

## Architecture Overview

### Core Components

**Agent System (`agents/`)**
- `BaseAgent`: Foundation class for all agents, extends OpenAI Agent with LiteLLM model support
- `AssistantManager`: Orchestrates the full conversational flow (query rewrite → planning → execution)
- Specialized agents: `Plan`, `QueryRewrite`, `WebSearch`, `AnswerReformulate`, `CodeInterpreter`
- `AgentRunner`: Handles both standard and streaming execution of agent workflows

**API Layer (`api/`)**
- FastAPI-based REST API with CORS middleware
- Routes: `boards`, `chats`, `tools`
- Lifespan management for database connections

**Data Storage (`store/`)**
- `ContentStore`: Manages notes, links, and messages in Qdrant vector database
- PostgreSQL stores for: chat history, graph data, user management
- Qdrant vector store for semantic search and embeddings

**Data Types (`datatypes/`)**
- `Chat`/`Message`: Conversation entities with reasoning steps
- `Note`/`Link`: Knowledge base content
- `Graph`: Relationship modeling
- Comprehensive enum definitions

### Configuration System

- `Config` class with singleton pattern loads from Doppler
- Stage-based configuration (LOCAL/DEV/PROD)
- Database connections: PostgreSQL, Qdrant
- API configurations: OpenAI, Mistral

### Agent Workflow

1. **Query Processing**: User input → QueryRewrite agent (with chat history context)
2. **Planning**: Plan agent determines execution strategy
3. **Tool Execution**: WebSearch, CodeInterpreter, knowledge base search
4. **Response**: AnswerReformulate provides final response
5. **Streaming**: Real-time response streaming with reasoning step tracking

### Key Features

- **Streaming Responses**: Full streaming support with semantic event handling
- **Tool System**: Agents can be converted to tools for use by other agents
- **Memory/Sessions**: Chat history management with reasoning step persistence
- **Vector Search**: Semantic search across notes, links, and messages
- **Multi-Model Support**: LiteLLM integration for various AI providers

### Prompt System

Jinja2 templates in `prompts/` directory for agent instructions:
- `plan.jinja`, `query_rewrite.system.jinja`, `web_search.jinja`
- `code_interpreter.jinja`, `answer_reformulation.system.jinja`

## Development Notes

- Uses async/await throughout for non-blocking operations
- Comprehensive logging with structured context
- Type hints with modern Python syntax (`type Entry = Note | Link | Message`)
- Pydantic models for data validation and serialization
- Database connection pooling and proper resource management
- Agent handoffs and tool chaining for complex workflows