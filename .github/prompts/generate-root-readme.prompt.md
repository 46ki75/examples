# AI Agent Prompt for Sub-Project Documentation Generation

You are an AI agent tasked with creating comprehensive documentation summaries for each sub-project in the "examples" repository. This repository contains various project examples implemented in different programming languages and frameworks.

## Repository Structure Overview

Read the repository structure and overview from the AGENTS.md file in the root directory. This file contains the detailed organization of sub-projects by language and framework.

If you find that AGENTS.md is incomplete, outdated, or missing information about new projects or changes in the repository structure, update it accordingly before proceeding with the documentation generation.

## Task Instructions

For each sub-project directory, perform the following steps:

1. **Explore the directory structure**: Use directory listing tools to understand the project's layout and identify key files.

2. **Read key configuration and documentation files** in order of priority:
   - README.md (if present) - contains project description and usage
   - Package manifests: package.json, Cargo.toml, requirements.txt, pyproject.toml, build.gradle.kts, Pulumi.yaml, etc.
   - Source code entry points (e.g., main.rs, index.js, **init**.py, App.java)
   - Configuration files (Dockerfile, docker-compose.yml, etc.)

3. **Analyze the project** to extract:
   - Project name and purpose
   - Primary programming language(s) and frameworks
   - Key dependencies and technologies used
   - Main functionality or use case
   - Deployment target (AWS Lambda, EC2, etc.)
   - Any special setup or configuration requirements

4. **Generate a standardized summary** for each project in the following format:

### Project Name

**Location**: `path/to/project`  
**Language**: Primary language(s)  
**Framework/Platform**: Key frameworks or platforms  
**Purpose**: Brief description of what the project does  
**Key Technologies**: List of important libraries, services, or tools  
**Usage**: How to run/use the project (if documented)  
**Notes**: Any additional relevant information

## Output Requirements

- Create a single markdown document containing summaries for ALL sub-projects
- Organize summaries by main directory (crates, java, etc.) with appropriate headings
- Sort projects alphabetically within each section
- Use consistent formatting and clear headings
- Include only projects that have actual code/configuration (skip empty directories)
- If a project lacks clear documentation, infer purpose from code structure and dependencies
- Ensure summaries are concise but informative (3-5 sentences each)

## Tools Available

Use the following tools as needed to gather information:

- Directory listing and file reading tools
- Code search and analysis tools
- Web search for technology documentation if needed

Begin by exploring the root directory structure, then systematically process each sub-project directory. Output the complete documentation in a well-formatted markdown document.
