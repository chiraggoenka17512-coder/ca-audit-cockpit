#!/usr/bin/env python3
"""
ReconOS Remote Autonomous Agent Runner for GitHub Actions
Enables 100% cloud-based development controlled via GitHub Mobile & Issues.
"""

import os
import sys
import json
import subprocess
import urllib.request
import urllib.error
from pathlib import Path

# Configuration
API_KEY = os.environ.get("GEMINI_API_KEY", "")
GITHUB_TOKEN = os.environ.get("GITHUB_TOKEN", "")
REPO = os.environ.get("GITHUB_REPOSITORY", "")
ISSUE_NUMBER = os.environ.get("ISSUE_NUMBER", "")
TASK_PROMPT = os.environ.get("TASK_PROMPT", "")
AGENT_ROLE = os.environ.get("AGENT_ROLE", "Full-Stack Engineer")

MODEL_NAME = "gemini-2.5-flash"
API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={API_KEY}"

def post_github_comment(issue_num, body):
    if not GITHUB_TOKEN or not REPO or not issue_num:
        return
    url = f"https://api.github.com/repos/{REPO}/issues/{issue_num}/comments"
    req = urllib.request.Request(
        url,
        data=json.dumps({"body": body}).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "ReconOS-Remote-Agent"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            print(f"[GitHub] Comment posted on #{issue_num}")
    except Exception as e:
        print(f"[GitHub] Error posting comment: {e}")

def create_pull_request(branch, title, body):
    if not GITHUB_TOKEN or not REPO:
        return None
    url = f"https://api.github.com/repos/{REPO}/pulls"
    req = urllib.request.Request(
        url,
        data=json.dumps({
            "title": title,
            "head": branch,
            "base": "main",
            "body": body
        }).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {GITHUB_TOKEN}",
            "Accept": "application/vnd.github.v3+json",
            "Content-Type": "application/json",
            "User-Agent": "ReconOS-Remote-Agent"
        }
    )
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            pr_url = data.get("html_url")
            print(f"[GitHub] Pull request created: {pr_url}")
            return pr_url
    except Exception as e:
        print(f"[GitHub] Note on PR creation (may already exist): {e}")
        return None

def call_gemini(system_prompt, messages):
    payload = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": messages,
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }
    req = urllib.request.Request(
        API_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
            candidate = res["candidates"][0]["content"]["parts"][0]["text"]
            return json.loads(candidate)
    except Exception as e:
        print(f"[Gemini] Error calling API: {e}")
        return None

def run_cmd(cmd):
    p = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    return p.returncode, p.stdout, p.stderr

def main():
    print("=" * 60)
    print("🤖 ReconOS Cloud Remote Agent Initializing...")
    print(f"Role: {AGENT_ROLE}")
    print(f"Issue: #{ISSUE_NUMBER}")
    print(f"Task: {TASK_PROMPT[:120]}...")
    print("=" * 60)

    if not API_KEY:
        msg = (
            "⚠️ **Remote Agent Paused:** `GEMINI_API_KEY` is missing from GitHub Repository Secrets.\n\n"
            "**To activate:**\n"
            "1. Open your repository on GitHub: `Settings` ➔ `Secrets and variables` ➔ `Actions`.\n"
            "2. Add repository secret named `GEMINI_API_KEY` with your Google AI Studio key.\n"
            "3. Reply to this issue with `/run` or trigger again from your phone!"
        )
        print(msg)
        post_github_comment(ISSUE_NUMBER, msg)
        sys.exit(1)

    branch_name = f"agent/issue-{ISSUE_NUMBER or 'cloud-task'}"
    run_cmd(f"git checkout -b {branch_name}")

    # Read contracts
    agents_contract = Path("AGENTS.md").read_text(encoding="utf-8") if Path("AGENTS.md").exists() else ""
    gemini_contract = Path("GEMINI.md").read_text(encoding="utf-8") if Path("GEMINI.md").exists() else ""

    system_instruction = f"""
You are the ReconOS Autonomous Remote Agent.
Role: {AGENT_ROLE}
Project Rules:
{agents_contract}

Strict Rules from GEMINI.md:
{gemini_contract}

Your output must be a valid JSON object with the following schema:
{{
  "thought": "Your reasoning and architectural plan",
  "files_to_write": [
    {{
      "path": "relative/path/to/file",
      "content": "Full source code content"
    }}
  ],
  "verification_commands": [
    "command string to run for validation (e.g., cargo check, npm run build, cargo test)"
  ],
  "pr_summary": "Clean markdown summary for the PR description"
}}
"""

    user_message = [
        {
            "role": "user",
            "parts": [{"text": f"Task instructions from Issue #{ISSUE_NUMBER}:\n{TASK_PROMPT}"}]
        }
    ]

    print("[Agent] Consulting Gemini model for code generation & plan...")
    plan = call_gemini(system_instruction, user_message)
    if not plan:
        print("[Agent] Failed to obtain valid plan from model.")
        sys.exit(1)

    print(f"[Agent Plan] {plan.get('thought', 'Planning complete.')}")

    # Write files
    for f in plan.get("files_to_write", []):
        path = Path(f["path"])
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f["content"], encoding="utf-8")
        print(f"[Agent Write] Updated {f['path']}")

    # Verification loop
    test_logs = []
    all_passed = True
    for cmd in plan.get("verification_commands", []):
        print(f"[Agent Verify] Running: {cmd}")
        code, out, err = run_cmd(cmd)
        test_logs.append(f"### `{cmd}` (Exit: {code})\n```\n{out}\n{err}\n```")
        if code != 0:
            all_passed = False
            print(f"[Agent Verify] Command failed with exit code {code}")

    # Git commit & push
    run_cmd("git config user.name 'ReconOS Cloud Agent'")
    run_cmd("git config user.email 'agent@reconos.local'")
    run_cmd("git add -A")
    commit_msg = f"feat(agent): {TASK_PROMPT[:60]} (fixes #{ISSUE_NUMBER})"
    run_cmd(f'git commit -m "{commit_msg}"')
    run_cmd(f"git push -u origin {branch_name} --force")

    # Create PR
    pr_body = (
        f"## 🤖 Autonomous Cloud Agent Implementation\n\n"
        f"**Resolves:** #{ISSUE_NUMBER}\n"
        f"**Role:** {AGENT_ROLE}\n\n"
        f"### Summary of Changes\n{plan.get('pr_summary', 'Automated implementation')}\n\n"
        f"### Verification Log\n" + "\n\n".join(test_logs)
    )
    pr_url = create_pull_request(branch_name, f"feat: {TASK_PROMPT[:60]}", pr_body)

    # Post comment back on issue
    status_emoji = "✅" if all_passed else "⚠️"
    issue_comment = (
        f"{status_emoji} **Remote Agent Execution Complete!**\n\n"
        f"**Branch:** `{branch_name}`\n"
        f"**Pull Request:** {pr_url or 'Created on branch'}\n\n"
        f"### Verification Status\n"
        f"{'All test checks passed cleanly!' if all_passed else 'Tests reported warnings/errors. Review PR logs.'}\n\n"
        f"You can review this PR from your phone on GitHub Mobile and merge when ready!"
    )
    post_github_comment(ISSUE_NUMBER, issue_comment)
    print("=" * 60)
    print("🚀 Remote Agent run complete.")
    print("=" * 60)

if __name__ == "__main__":
    main()
