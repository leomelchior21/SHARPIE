FROM mcr.microsoft.com/dotnet/sdk:8.0-bookworm-slim

RUN groupadd --gid 10001 sharpie \
    && useradd --uid 10001 --gid sharpie --no-create-home --shell /usr/sbin/nologin sharpie \
    && mkdir -p /runner /workspace \
    && chown -R sharpie:sharpie /runner /workspace

COPY --chown=sharpie:sharpie SharpieSnippet.csproj /runner/SharpieSnippet.csproj
COPY --chown=sharpie:sharpie run.sh /runner/run.sh
RUN chmod 0555 /runner/run.sh

USER sharpie
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_NOLOGO=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    NUGET_XMLDOC_MODE=skip \
    HOME=/workspace

ENTRYPOINT ["/runner/run.sh"]
