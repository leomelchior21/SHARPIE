FROM node:22-bookworm-slim AS client-build
WORKDIR /source
COPY package.json package-lock.json* ./
RUN npm ci
COPY index.html tsconfig.json tsconfig.app.json tsconfig.node.json vite.config.ts ./
COPY src ./src
RUN npm run build

FROM mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim AS api-build
WORKDIR /source
COPY server/Sharpie.Api/Sharpie.Api.csproj ./
RUN dotnet restore Sharpie.Api.csproj
COPY server/Sharpie.Api/Program.cs ./
RUN dotnet publish Sharpie.Api.csproj --configuration Release --output /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:8.0-bookworm-slim AS final
RUN apt-get update \
    && apt-get install -y --no-install-recommends docker.io \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=api-build /app ./
COPY --from=client-build /source/dist ./wwwroot
ENV ASPNETCORE_URLS=http://+:8080 \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1 \
    SHARPIE_RUNNER_IMAGE=sharpie-csharp-runner:latest
EXPOSE 8080
ENTRYPOINT ["dotnet", "Sharpie.Api.dll"]
