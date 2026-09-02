# SHARPIE

SHARPIE is a classroom-first C# playground: write one small piece of real C#, run it, and see the result without project files, namespaces, or a visible `Main` method.

## What is included

- A session-only name gate—no account or database.
- A five-module cartridge hub, with only WriteLine Playground active.
- Eight lightweight WriteLine challenges in one consistent workspace.
- A CodeMirror editor with C# highlighting, line numbers, diagnostics, and `Ctrl/Cmd + Enter`.
- A designed output surface, progressive hints, reset confirmation, and session completion.
- A real .NET 8 runner isolated in a fresh Docker container for every execution.

## Run the complete app

Docker Desktop (or Docker Engine with Compose) is required.

```bash
docker compose up --build
```

Open [http://localhost:8080](http://localhost:8080).

The Compose build creates two images: the web/API service and the disposable C# runner. The `runner-image` service exits immediately after ensuring its image exists; that is expected.

## Frontend development

```bash
npm install
npm run dev
```

Vite runs on `http://localhost:5173` and proxies `/api` to `http://localhost:5050`. For interface-only development, the app still loads without the API and shows a clear runner-offline state when RUN is pressed.

To run the API directly, it still needs access to a Docker daemon and the runner image:

```bash
docker build -t sharpie-csharp-runner:latest server/Sharpie.Runner
dotnet run --project server/Sharpie.Api --urls http://localhost:5050
```

## Why the runner uses Docker

Student snippets are real modern C# top-level statements. The hidden SDK project enables implicit imports, so `Console.WriteLine("Hello!");` is the complete visible program.

Each RUN starts a disposable container with:

- no network;
- a read-only root filesystem and capped temporary workspace;
- all Linux capabilities removed and `no-new-privileges`;
- a non-root user;
- CPU, memory, and process-count limits;
- a two-second code timeout and ten-second total request timeout;
- a 16 KB output limit.

The API rate-limits requests and translates the first real compiler diagnostic into a short student-facing explanation while preserving the C# error code and message. Mounting the Docker socket is a privileged deployment concern: deploy the API only on a dedicated host and do not expose its container to untrusted administrators. For larger installations, replace the local Docker launcher with a dedicated sandbox worker pool while keeping the same `/api/run` contract.

## Verification

```bash
npm test
npm run build
dotnet build server/Sharpie.Api/Sharpie.Api.csproj
```
