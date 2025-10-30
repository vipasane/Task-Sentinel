# Setup Instructions

## Setup Commands

Below are the commands that were run to set up this project with Claude Code and GitHub integration:

### 1. Install Claude Code CLI
```bash
npm install -g @anthropic-ai/claude-code@latest
```
Installs the latest version of Claude Code CLI globally using npm, making the `claude` command available system-wide.

### 2. Run Claude Code
```bash
claude --dangerously-skip-permissions
```
Launches Claude Code CLI with permission checks disabled. The `--dangerously-skip-permissions` flag bypasses permission prompts for tool usage (use with caution as it allows Claude to execute commands without explicit approval).

### 3. Authenticate with GitHub
```bash
gh auth login
```
Authenticates the GitHub CLI (`gh`) with your GitHub account. This opens an interactive login flow to connect your terminal with GitHub.

### 4. Install Claude GitHub App
```bash
claude /install-github-app
```
Installs the Claude GitHub App integration, which enables Claude to interact with GitHub repositories, create pull requests, and perform other GitHub operations directly from the CLI.

### 5. Install Claude Code Plugins
In Claude Code, run these commands to add plugin marketplaces and install skills:

```bash
/plugin marketplace add anthropics/skills
/plugin install document-skills@anthropic-agent-skills
/plugin install example-skills@anthropic-agent-skills
```
- Adds Anthropic's official skills marketplace
- Installs document processing skills for working with various document formats
- Installs example skills to demonstrate Claude Code capabilities

```bash
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```
- Adds the superpowers marketplace by obra
- Installs the superpowers plugin which provides additional capabilities for Claude Code

## Things to be Installed

### Claude Flow
```bash
npx claude-flow@alpha init --force
```
Initializes Claude Flow (alpha version) in the project. The `--force` flag will overwrite any existing configuration. Claude Flow helps orchestrate complex workflows with Claude.
