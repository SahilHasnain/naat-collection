---
description: "Scaffold a new Appwrite serverless function with boilerplate, package.json, and handler"
argument-hint: "Function name and purpose, e.g., 'track-play-count — tracks how many times each naat is played'"
agent: "naat-dev"
tools: [edit, read, search, execute]
---

Create a new Appwrite serverless function in the `functions/` directory.

## Requirements

- Parse the function name and purpose from the user input
- Follow the exact conventions used by existing functions in `functions/`

## Structure to Create

```
functions/<function-name>/
  src/main.js        → Handler implementation
  package.json       → Function-specific dependencies
```

## Handler Template

Use ES modules (`"type": "module"`) with this handler signature:

```javascript
import { Client, Databases, Query } from "node-appwrite";

export default async ({ req, res, log, error }) => {
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
      .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const databases = new Databases(client);
    const databaseId = process.env.APPWRITE_DATABASE_ID;

    // Implementation here

    return res.json({ success: true });
  } catch (err) {
    error(`Error: ${err.message}`);
    return res.json({ success: false, error: err.message }, 500);
  }
};
```

## package.json Template

```json
{
  "name": "<function-name>",
  "version": "1.0.0",
  "description": "<purpose>",
  "main": "src/main.js",
  "type": "module",
  "dependencies": {
    "node-appwrite": "^14.2.0"
  }
}
```

## Rules

- Use environment variables for all Appwrite IDs — never hardcode
- Add Supabase (`@supabase/supabase-js`) only if the function needs vector search or Supabase-specific features
- Add OpenAI (`openai`) only if the function needs embeddings or AI
- Add a JSDoc comment block at the top of `main.js` describing the function purpose and required env vars
- Keep the function focused on a single responsibility
