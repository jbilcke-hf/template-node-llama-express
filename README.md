---
title: Template Node Llama Express
emoji: 🏗️
colorFrom: gray
colorTo: blue
sdk: docker
pinned: false
app_port: 7860
---

A minimalist Docker Space to help people getting started with Node, Express, node-llama and TypeScript

## Installation

### Prerequisites

- Install NVM: https://github.com/nvm-sh/nvm
- Install Docker https://www.docker.com

### Downloading the model

### Building and run without Docker

You need to downloaded yourself `airoboros-13b-gpt4.ggmlv3.q4_0.bin` in the `./models/` folder.
If you plan to change the model, then edit the `modelPath` in `/src/index.mts`` acconrdingly.

```bash
nvm use
npm i
npm run start
```

Then open the generator by passing a prompt in the query parameters:

[http://localhost:7860?prompt=a webpage recipe for making chocolate chip cookies](http://localhost:7860/?prompt=a%20webpage%20recipe%20for%20making%20chocolate%20chip%20cookies)

### Building and running with Docker

Note: the model will be downloaded by Docker,
see the last lines in the Dockerfile.

```bash
npm run docker
```

This script is a shortcut executing the following commands:

```bash
docker build -t template-node-llama-express .
docker run -it -p 7860:7860 template-node-llama-express
```
