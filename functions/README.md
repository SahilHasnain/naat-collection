# Appwrite Functions

This directory contains Appwrite Functions for the Naat Platform. Functions are serverless backend logic that run on Appwrite's infrastructure.

## Available Functions

### 1. Video Ingestion Function (`ingest-videos/`)

Automatically fetches naat videos from a YouTube channel and stores them in the Appwrite database.

**Key Features:**

- Scheduled execution (cron job)
- YouTube Data API integration
- Duplicate detection
- Error handling and logging

**Documentation:** See [ingest-videos/README.md](./ingest-videos/README.md)

## Prerequisites

1. **Appwrite CLI**: Install from [appwrite.io/docs/command-line](https://appwrite.io/docs/command-line)
2. **Appwrite Account**: Create a project at [cloud.appwrite.io](https://cloud.appwrite.io)
3. **API Keys**: Generate API keys with appropriate permissions

## Quick Start

### 1. Install Appwrite CLI

```bash
# Using npm
npm install -g appwrite-cli

# Using Homebrew (macOS)
brew install appwrite

# Using Scoop (Windows)
scoop install appwrite
```

### 2. Login to Appwrite

```bash
appwrite login
```

### 3. Initialize Project

```bash
# From the project root
appwrite init project

# Follow the prompts to select your project
```

### 4. Deploy a Function

```bash
# Deploy all functions
appwrite deploy function

# Deploy a specific function
cd functions/ingest-videos
appwrite deploy function
```

## Function Structure

Each function follows this structure:

```
function-name/
├── src/
│   └── main.js          # Function entry point
├── package.json         # Dependencies
├── appwrite.json        # Function configuration
├── .env.example         # Environment variables template
├── .gitignore          # Git ignore rules
└── README.md           # Function documentation
```

## Environment Variables

Functions use environment variables for configuration. These are set in the `appwrite.json` file under the `variables` section.

**Security Best Practices:**

- Never commit actual API keys or secrets to version control
- Use `.env` files for local testing (add to `.gitignore`)
- Store sensitive values in Appwrite's environment variables
- Use different API keys for development and production

## Local Testing

Each function includes a local testing script:

```bash
cd functions/function-name
cp .env.example .env
# Edit .env with your credentials
node test-local.js
```

## Monitoring

Monitor function executions:

1. **Appwrite Console**: Navigate to Functions > [Function Name] > Executions
2. **Logs**: View detailed logs for each execution
3. **Metrics**: Track execution count, duration, and errors

## Troubleshooting

### Function deployment fails

- Verify you're logged in: `appwrite client --version`
- Check your `appwrite.json` configuration
- Ensure all dependencies are listed in `package.json`

### Function execution fails

- Check the function logs in Appwrite Console
- Verify all environment variables are set correctly
- Test the function locally first

### Timeout errors

- Increase the `timeout` value in `appwrite.json`
- Optimize your function code for better performance
- Consider breaking large operations into smaller chunks

## Best Practices

1. **Error Handling**: Always implement comprehensive error handling
2. **Logging**: Use the provided `log()` and `error()` functions
3. **Timeouts**: Set appropriate timeout values based on function complexity
4. **Dependencies**: Keep dependencies minimal and up-to-date
5. **Testing**: Test functions locally before deploying
6. **Documentation**: Document environment variables and usage

## Resources

- [Appwrite Functions Documentation](https://appwrite.io/docs/functions)
- [Appwrite CLI Documentation](https://appwrite.io/docs/command-line)
- [Node.js SDK Documentation](https://appwrite.io/docs/sdks#server)
- [Appwrite Community Discord](https://appwrite.io/discord)

## Contributing

When adding new functions:

1. Follow the existing structure
2. Include comprehensive documentation
3. Add local testing capabilities
4. Document all environment variables
5. Implement proper error handling
6. Add deployment scripts if needed

## License

This project is part of the Naat Platform.
