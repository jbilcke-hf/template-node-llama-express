import express from "express"
import { LLM } from "llama-node"
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js"

(async () => {
  const llama = new LLM(LLamaCpp)
  await llama.load({
    // If you plan to use a different model you also need to edit line 26 in the Dockerfile
    modelPath: "./models/airoboros-13b-gpt4.ggmlv3.q4_0.bin",
    enableLogging: false,
    nCtx: 1024,
    seed: 0,
    f16Kv: false,
    logitsAll: false,
    vocabOnly: false,
    useMlock: false,
    embedding: false,
    useMmap: true,
    nGpuLayers: 0
  })

  const app = express()
  const port = 7860
  app.use(express.static("public"))

  app.get("/", async (req, res) => {
    res.write("<html><head>")

    await llama.createCompletion({
      prompt: `# Instructions
Generate an HTML webpage about: ${req.query.prompt}
Use English, not Latin!
To create section titles, please use <h2>, <h3> etc
# HTML output
<html><head>`,
      nThreads: 6,
      nTokPredict: 2048,
      topK: 40,
      topP: 0.1,
      temp: 0.3,
      repeatPenalty: 1,
    }, (response) => {
      res.write(response.token)
    });

    res.end()
  })

  app.listen(port, () => { console.log(`Open http://localhost:${port}`) })
})()
