## Prerequisites

You need to install nodejs on the machine to be able to run frontend

For backend, just create a virtual env and install all dependencies with

```bash
uv pip install pyproject.toml
```

### Backend
```bash
# it will serve api at port 8888 by default unless u provide a custom port
python -m topix.api.app --port <custom-port>
```

### Frontend

In `webui/` create a file name `.env` like this:

```
VITE_TOPIX_URL=http://localhost:<custom-port>
```

```bash
cd webui/
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