<table width="100%">
  <tr>
    <td width="100%" align="center" bgcolor="#0d1117">
      <br>
      <img src="public/logo.png" alt="Idra logo" width="320">
      <br><br>
    </td>
  </tr>
</table>

# Idra

Idra is a self-hosted AI workspace for getting real work done with your own models, files, and tools. It gives you a focused browser console where an agent can understand a persistent workspace, act on its contents, and continue the conversation across follow-up prompts.

## What you can do

- **Work with your files.** Ask Idra to read, create, edit, and organize files in its persistent workspace or run commands needed to complete a task.
- **Choose your model.** Connect Anthropic, OpenAI, or DeepSeek and select the model you want to use.
- **Keep context between prompts.** Responses stream into the console, and follow-up messages continue in the same saved session until you start a new one.
- **Connect more tools.** Add local or remote MCP servers to give the agent access to the services and capabilities you choose.
- **Delegate larger jobs.** Idra can split independent work across parallel subagents and bring the results back into the main task.
- **Keep work across restarts.** Workspace files, conversations, settings, and configuration live in a persistent data volume.

## Get started

You need Docker with Docker Compose.

```bash
git clone https://github.com/HaraldBregu/idra.git
cd idra
docker compose up --build --wait -d
```

Open [http://localhost:3000](http://localhost:3000), then:

1. Select **Generate access key**, copy the key, and store it somewhere safe.
2. Paste the key into the access field and select **Save and continue**.
3. In **Provider and model**, choose Anthropic, OpenAI, or DeepSeek, enter a current model ID and your provider API key, then save the configuration.
4. Ask Idra to help with something in your workspace. Follow-up prompts continue the same session; select **New session** when you want a fresh conversation.

Idra stores its working data in the `idra-data` Docker volume. Recreating the container with `docker compose down` followed by `docker compose up --wait -d` keeps that volume and its contents. Do not add `--volumes` unless you intend to remove the stored data.

## Make Idra yours

The workspace is created at `/data/workspace`. Its `AGENTS.md` file contains durable guidance for the agent, so you can describe how you want it to work and keep related files alongside that guidance.

The **MCP servers** panel accepts an `mcp.json` configuration for enabled stdio or HTTP MCP servers. Connected tools become available to the agent on later runs.

For trusted backend integrations, Idra can also expose an opt-in A2A 1.0 interface. It remains disabled until both `IDRA_AGENT_TOKEN` and `IDRA_PUBLIC_URL` are configured. Keep its bearer token in backend secret storage and expose the integration only over HTTPS.

## Privacy and trust

Idra is designed to run under your control:

- Docker Compose binds the app to `127.0.0.1:3000` by default instead of exposing it to the network.
- The browser console is protected by an access key. Idra stores a salted verifier rather than the plaintext key and uses an `HttpOnly` session cookie after login.
- Provider and MCP credentials stay server-side in files created with mode `0600`; saved provider keys are not returned to the browser.
- Conversations, workspace files, and configuration remain in your Idra data volume unless you deliberately move or delete them.
- Requests and relevant content are still sent to the AI provider you configure, and connected MCP tools may receive data needed to perform a task. Review those services' policies and grant only the access you intend.
- A2A access is separate from console access and is off by default.

Protect the Docker volume and keep access, provider, MCP, admin, and A2A tokens out of source control. If an access key is lost, remove only `/data/access.json` from the stopped app's volume to return to first-run setup; complete setup before making the service reachable beyond localhost.

## Project

Idra is available under the [MIT License](LICENSE).

- Learn how to set up the development environment and submit changes in [CONTRIBUTING.md](CONTRIBUTING.md).
- Read the supported versions, security baseline, and private reporting process in [SECURITY.md](SECURITY.md).
