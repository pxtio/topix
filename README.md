# Prerequisites

You need to install:
- Nodejs to be able to run frontend
- uv to be able to run the backend


# Backend
For launching, the backend execute the following commands:

```bash
cd topix
uv sync
# it will serve api at port 8888 by default unless u provide a custom port
uv run python -m src.api.app --port <custom-port>
```

# Frontend


In `webui/` folder, create a file name `.env` like this:

```
VITE_TOPIX_URL=http://localhost:<custom-port>
```

Move to the frontend folder from the root of the repo
```bash
cd webui
```

**Development:**

For development, you need to install all packages with:

```bash
npm install
```

Then this command allows to view interface in DEV mode

```bash
npm run dev # this will run on port 5173
```

**Production Preview:**

Once the interface is ready, you can build it with

```bash
npm run build
```

Then it's ready for preview, using:

```bash
serve dist/
```

By default the app will be deployed on port `3000`