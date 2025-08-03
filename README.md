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

if you change the port of api, you must change accordingly in `webui/src/config/api.ts`

```tsx
export const API_URL = "http://localhost:8888"  // -> your api custom port
```

```bash
cd webui/
# first time you will need to run npm install to install all packages
# next time no need
npm install
npm run dev # this will run on port 5173
```

For now the app is deployed on port `3000`

