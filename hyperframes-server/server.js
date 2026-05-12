import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

process.on("uncaughtException", (err) => {
  if (err.code === "EPIPE") return;
  console.error("Uncaught exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});

app.use(cors());
app.use(express.json({ limit: "10mb" }));

function validateComposition(html) {
  const required = [
    "data-composition-id",
    "window.__timelines",
    'class="clip"',
    "gsap.timeline",
  ];

  for (const item of required) {
    if (!html.includes(item)) {
      throw new Error(`Invalid composition: missing ${item}`);
    }
  }

  return true;
}
function runRender(tempDir, outputPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      "npx",
      [
        "hyperframes",
        "render",
        tempDir,
        "--delay",
        "2000",
        "--output",
        outputPath,
        "--no-browser-gpu",
        "--workers",
        "1",
      ],
      {
        cwd: __dirname,
        env: {
          ...process.env,
          PUPPETEER_EXECUTABLE_PATH: "/usr/bin/google-chrome-stable",
          PRODUCER_FORCE_SCREENSHOT: "true",
          PRODUCER_BROWSER_GPU_MODE: "software",
          PRODUCER_ENABLE_STREAMING_ENCODE: "false",
          CHROME_FLAGS:
            "--no-sandbox --disable-dev-shm-usage --disable-setuid-sandbox",
        },
      },
    );

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.stdout.on("error", () => {});
    child.stderr.on("error", () => {});

    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Render timed out after 180s"));
    }, 180000);

    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      console.log("Render stdout:", stdout.slice(0, 1000));
      if (stderr) {
        console.error("FULL RENDER STDERR:");
        console.error(stderr);
      }
      if (code === 0) resolve();
      else
        reject(
          new Error(`Render exited with code ${code}: ${stderr.slice(-500)}`),
        );
    });
  });
}

app.post("/render", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "No HTML provided" });

  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const htmlPath = path.join(tempDir, "index.html");
  const outputPath = path.join(tempDir, "output.mp4");

  validateComposition(html);
  fs.writeFileSync(htmlPath, html);

  try {
    await runRender(tempDir, outputPath);

    if (!fs.existsSync(outputPath)) {
      throw new Error("Output file not created");
    }

    const fileBuffer = fs.readFileSync(outputPath);
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=composition.mp4",
    );
    res.setHeader("Content-Length", fileBuffer.length);
    res.end(fileBuffer);
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (err) {
    console.error("Render error:", err.message);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}
    if (!res.headersSent) {
      res.status(500).json({ error: "Render failed", details: err.message });
    }
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("Render server running on port 3001"));
