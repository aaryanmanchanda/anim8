import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.post("/render", async (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ error: "No HTML provided" });

  const tempDir = path.join(__dirname, "temp", Date.now().toString());
  fs.mkdirSync(tempDir, { recursive: true });

  const htmlPath = path.join(tempDir, "index.html");
  const outputPath = path.join(tempDir, "output.mp4");



  fs.writeFileSync(htmlPath, html);

  try {
    const { stdout, stderr } = await execAsync(
      `npx hyperframes render ${tempDir} --output ${outputPath} --no-browser-gpu`,
      { cwd: __dirname, timeout: 120000 }
    );
    console.log(stdout);
    if (stderr) console.error(stderr);

    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", "attachment; filename=composition.mp4");
    const stream = fs.createReadStream(outputPath);
    stream.pipe(res);
    stream.on("end", () => fs.rmSync(tempDir, { recursive: true, force: true }));
  } catch (err) {
    console.error("Render error:", err.message);
    fs.rmSync(tempDir, { recursive: true, force: true });
    res.status(500).json({ error: "Render failed", details: err.message });
  }
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.listen(3001, () => console.log("Render server running on port 3001"));
