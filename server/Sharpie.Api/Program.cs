using System.Diagnostics;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy => policy
        .WithOrigins("http://localhost:5173", "http://127.0.0.1:5173")
        .AllowAnyHeader()
        .AllowAnyMethod());
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 30,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 2,
                QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true,
            }));
});

builder.Services.AddSingleton<DockerCSharpRunner>();

var app = builder.Build();
app.UseCors();
app.UseRateLimiter();
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/api/health", () => Results.Ok(new { status = "ready" }));

app.MapPost("/api/run", async (RunRequest request, DockerCSharpRunner runner, CancellationToken cancellationToken) =>
{
    if (string.IsNullOrWhiteSpace(request.Code))
    {
        return Results.BadRequest(new { message = "Code is required." });
    }

    if (request.Code.Length > 12_000)
    {
        return Results.BadRequest(new { message = "Keep the experiment under 12,000 characters." });
    }

    return Results.Ok(await runner.RunAsync(request.Code, cancellationToken));
});

app.MapFallbackToFile("index.html");
app.Run();

public sealed record RunRequest(string Code);

public sealed record RunResponse(
    bool Success,
    string Output,
    long DurationMs,
    bool Truncated = false,
    RunError? Error = null);

public sealed record RunError(
    string Title,
    string Message,
    string Compiler,
    string? Code = null,
    int? Line = null,
    int? Column = null);

public sealed partial class DockerCSharpRunner(ILogger<DockerCSharpRunner> logger)
{
    private const int OutputLimit = 16_384;
    private readonly string _runnerImage = Environment.GetEnvironmentVariable("SHARPIE_RUNNER_IMAGE")
        ?? "sharpie-csharp-runner:latest";
    private readonly string _dockerPath = Environment.GetEnvironmentVariable("SHARPIE_DOCKER_PATH")
        ?? "docker";

    public async Task<RunResponse> RunAsync(string code, CancellationToken requestCancellation)
    {
        var started = Stopwatch.StartNew();
        var containerName = $"sharpie-run-{Guid.NewGuid():N}";
        using var hardTimeout = CancellationTokenSource.CreateLinkedTokenSource(requestCancellation);
        hardTimeout.CancelAfter(TimeSpan.FromSeconds(10));

        var startInfo = new ProcessStartInfo
        {
            FileName = _dockerPath,
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        foreach (var argument in new[]
        {
            "run", "--name", containerName, "--rm", "-i",
            "--network", "none",
            "--memory", "384m",
            "--memory-swap", "384m",
            "--cpus", "0.75",
            "--pids-limit", "64",
            "--read-only",
            "--cap-drop", "ALL",
            "--security-opt", "no-new-privileges",
            "--tmpfs", "/workspace:rw,nosuid,size=96m",
            _runnerImage,
        })
        {
            startInfo.ArgumentList.Add(argument);
        }

        try
        {
            using var process = new Process { StartInfo = startInfo };
            if (!process.Start())
            {
                return Offline(started.ElapsedMilliseconds, "Docker could not start the runner.");
            }

            var stdoutTask = ReadBoundedAsync(process.StandardOutput, OutputLimit);
            var stderrTask = ReadBoundedAsync(process.StandardError, OutputLimit);

            await process.StandardInput.WriteAsync(code.AsMemory(), hardTimeout.Token);
            await process.StandardInput.FlushAsync(hardTimeout.Token);
            process.StandardInput.Close();

            try
            {
                await process.WaitForExitAsync(hardTimeout.Token);
            }
            catch (OperationCanceledException) when (!requestCancellation.IsCancellationRequested)
            {
                TryRemoveContainer(containerName);
                return new RunResponse(false, "", started.ElapsedMilliseconds, Error: new RunError(
                    "THAT TOOK TOO LONG",
                    "This experiment ran for too long, so SHARPIE stopped it.",
                    "Execution stopped after the classroom time limit."));
            }

            var (stdout, stdoutTruncated) = await stdoutTask;
            var (stderr, stderrTruncated) = await stderrTask;
            var wasTruncated = stdoutTruncated || stderrTruncated;

            if (process.ExitCode == 0)
            {
                return new RunResponse(true, Normalize(stdout), started.ElapsedMilliseconds, wasTruncated);
            }

            if (process.ExitCode == 124)
            {
                return new RunResponse(false, Normalize(stdout), started.ElapsedMilliseconds, wasTruncated, new RunError(
                    "THAT TOOK TOO LONG",
                    "This experiment kept running, so SHARPIE stopped it.",
                    "Execution limit reached after 2 seconds."));
            }

            var diagnosticSource = string.Join('\n', new[] { stderr, stdout }.Where(value => !string.IsNullOrWhiteSpace(value)));
            return process.ExitCode == 20
                ? CompilerFailure(diagnosticSource, started.ElapsedMilliseconds, wasTruncated)
                : RuntimeFailure(diagnosticSource, stdout, started.ElapsedMilliseconds, wasTruncated);
        }
        catch (OperationCanceledException) when (requestCancellation.IsCancellationRequested)
        {
            TryRemoveContainer(containerName);
            throw;
        }
        catch (Exception exception) when (exception is System.ComponentModel.Win32Exception or InvalidOperationException)
        {
            logger.LogError(exception, "The isolated C# runner could not start");
            return Offline(started.ElapsedMilliseconds, "The isolated C# service is not available.");
        }
    }

    private static RunResponse CompilerFailure(string diagnostic, long duration, bool truncated)
    {
        var match = CompilerErrorRegex().Match(diagnostic);
        if (!match.Success)
        {
            return new RunResponse(false, "", duration, truncated, new RunError(
                "C# NEEDS ANOTHER LOOK",
                "The compiler found something it could not understand yet.",
                CleanDiagnostic(diagnostic)));
        }

        var errorCode = match.Groups[3].Value;
        var compilerMessage = match.Groups[4].Value.Trim();
        var (title, message) = FriendlyCompilerMessage(errorCode, compilerMessage);

        return new RunResponse(false, "", duration, truncated, new RunError(
            title,
            message,
            $"{errorCode} — {compilerMessage}",
            errorCode,
            int.Parse(match.Groups[1].Value),
            int.Parse(match.Groups[2].Value)));
    }

    private static RunResponse RuntimeFailure(string diagnostic, string stdout, long duration, bool truncated)
    {
        var clean = CleanDiagnostic(diagnostic);
        var firstLine = clean.Split('\n', StringSplitOptions.RemoveEmptyEntries).FirstOrDefault()
            ?? "The program stopped while it was running.";

        return new RunResponse(false, Normalize(stdout), duration, truncated, new RunError(
            "THE PROGRAM STOPPED",
            "C# understood the code, but something went wrong while it ran.",
            firstLine));
    }

    private static RunResponse Offline(long duration, string detail) => new(false, "", duration, Error: new RunError(
        "RUNNER OFFLINE",
        "The C# engine is not ready right now.",
        detail));

    private static (string Title, string Message) FriendlyCompilerMessage(string code, string compilerMessage) => code switch
    {
        "CS1002" => ("SOMETHING'S MISSING", "C# expected a ; here."),
        "CS0103" => ("UNKNOWN NAME", "C# does not recognize one of the names here yet."),
        "CS1010" => ("CHECK THE QUOTES", "A line of text is missing its closing quotation mark."),
        "CS1026" => ("CHECK THE PARENTHESES", "C# expected a closing ) here."),
        "CS1513" => ("CHECK THE BRACES", "C# expected a closing } here."),
        _ => ("C# NEEDS ANOTHER LOOK", SimplifyMessage(compilerMessage)),
    };

    private static string SimplifyMessage(string message)
    {
        if (message.Contains("expected", StringComparison.OrdinalIgnoreCase))
        {
            return "C# expected one more piece of code here.";
        }

        return "The compiler found something it could not understand yet.";
    }

    private void TryRemoveContainer(string containerName)
    {
        try
        {
            using var cleanup = Process.Start(new ProcessStartInfo
            {
                FileName = _dockerPath,
                UseShellExecute = false,
                CreateNoWindow = true,
                ArgumentList = { "rm", "-f", containerName },
            });
            cleanup?.WaitForExit(2_000);
        }
        catch (Exception exception)
        {
            logger.LogWarning(exception, "Could not remove timed-out runner {ContainerName}", containerName);
        }
    }

    private static async Task<(string Value, bool Truncated)> ReadBoundedAsync(StreamReader reader, int limit)
    {
        var result = new StringBuilder(Math.Min(limit, 4_096));
        var buffer = new char[2_048];
        var truncated = false;
        int read;
        while ((read = await reader.ReadAsync(buffer)) > 0)
        {
            var remaining = limit - result.Length;
            if (remaining > 0)
            {
                result.Append(buffer, 0, Math.Min(remaining, read));
            }
            if (read > remaining) truncated = true;
        }
        return (result.ToString(), truncated);
    }

    private static string Normalize(string value) => value.Replace("\r\n", "\n").TrimEnd() + (value.Length > 0 ? "\n" : "");

    private static string CleanDiagnostic(string value)
    {
        var clean = value
            .Replace("/workspace/Program.cs", "Program.cs")
            .Replace("/workspace/SharpieSnippet.csproj", "SharpieSnippet")
            .Replace("\r", "")
            .Trim();
        return clean.Length > 600 ? clean[..600] + "…" : clean;
    }

    [GeneratedRegex(@"Program\.cs\((\d+),(\d+)\):\s+error\s+(CS\d+):\s+([^\r\n\[]+)", RegexOptions.IgnoreCase)]
    private static partial Regex CompilerErrorRegex();
}
