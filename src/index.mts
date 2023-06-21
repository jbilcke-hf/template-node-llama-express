import express from "express"
import { LLM } from "llama-node"
import { LLamaCpp } from "llama-node/dist/llm/llama-cpp.js"


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

const timeoutInSec = 3 * 60 // 1 min how before killing a request

app.use(express.static("public"))
 
const maxParallelRequests = 1

const pending: {
  total: number;
  queue: string[];
  aborts: Record<string, any>,
} = {
  total: 0,
  queue: [],
  aborts: {},
}
 
const endRequest = (id: string, reason: string) => {
  if (!id || !pending.queue.includes(id)) {
    return
  }
  
  // politely ask the LLM to stop
  try {
    pending.aborts[id].abort()
  } catch (err) {
    console.log(`could not abort request ${id} (${err})`)
  }
  // remove the request from everywhere
  try {
    pending.queue = pending.queue.filter(i => i !== id)
    delete pending.aborts[id]
    console.log(`cleaned up request ${id}`)
  } catch (err) {
    console.log(`failed to properly clean up request ${id}`)
  }
  console.log(`request ${id} ended (${reason})`)
}
app.get("/debug", (req, res) => {
  res.write(JSON.stringify({
    nbTotal: pending.total,
    nbPending: pending.queue.length,
    queue: pending.queue,
  }))
  res.end()
})

app.get("/", async (req, res) => {
  // naive implementation: we say we are out of capacity
  if (pending.queue.length >= maxParallelRequests) {
    res.write('sorry, max nb of parallel request reached')
    res.end()
    return
  }
  // alternative approach: kill old queries
  // while (pending.queue.length > maxParallelRequests) {
  //   endRequest(pending.queue[0], 'max nb of parallel request reached')
  // }

  const id = `${pending.total++}`
  console.log(`new request ${id}`)

  pending.queue.push(id)
  pending.aborts[id] = new AbortController() 

  res.write("<html><head>")

  req.on("close", function() {
    endRequest(id, "browser ended the connection")
  })

  // for testing we kill after some delay
  setTimeout(() => {
    endRequest(id, `timed out after ${timeoutInSec}s`)
  }, timeoutInSec * 1000)

  const options = {
    prompt: `# Instructions
Generate an HTML webpage about: ${req.query.prompt}
Use English, not Latin!
To create section titles, please use <h2>, <h3> etc
# HTML output
<html><head>`,
    nThreads: 2,
    nTokPredict: 1024,
    topK: 40,
    topP: 0.1,
    temp: 0.3,
    repeatPenalty: 1,
  }
      
  try {
    await llama.createCompletion(options, (response) => {
      try {
        res.write(response.token)
      } catch (err) {
        console.log(`coudln't write the LLM response to the HTTP stream ${err}`)
      }
    }, pending.aborts[id].signal)
    endRequest(id, `normal end of the llama stream for request ${id}`)
  } catch (e) {
    endRequest(id, `premature end of the llama stream for request ${id} (${e})`)
  } 

  try {
    res.end()
  } catch (err) {
    console.log(`couldn't end the HTTP stream for request ${id} (${err})`)
  }
  
})

app.listen(port, () => { console.log(`Open http://localhost:${port}/?prompt=a%20webpage%20recipe%20for%20making%20chocolate%20chip%20cookies`) })