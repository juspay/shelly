# Getting Started

> Quick start guide for @juspay/shelly

## Installation

### Prerequisites

- Node.js 16.x or higher
- npm 7.x or higher

### Install @juspay/shelly

```bash
npm install @juspay/shelly
```

### For Development

```bash
git clone https://github.com/juspay/shelly
cd shelly
npm install
npm run dev
```

## Quick Start

### Basic Usage

```javascript
const shelly = require('@juspay/shelly');

// Initialize
const client = new shelly({
  apiKey: 'your-api-key'
});

// Basic operation
const result = await client.method();
console.log(result);
```

### Configuration

Create a `.env` file:

```env
API_KEY=your_api_key_here
NODE_ENV=development
```

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Format code
npm run format
```

## Examples

### Example 1: Basic Setup

```javascript
const shelly = require('@juspay/shelly');

const client = new shelly({
  apiKey: process.env.API_KEY
});

async function example() {
  try {
    const result = await client.getData();
    console.log('Success:', result);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

example();
```

### Example 2: Advanced Configuration

```javascript
const shelly = require('@juspay/shelly');

const client = new shelly({
  apiKey: process.env.API_KEY,
  timeout: 5000,
  retries: 3,
  debug: true
});

// Your code here
```

## Next Steps

- Read the [API Documentation](./API.md)
- Check out [examples/](../examples/)
- Join our community: opensource@juspay.in

## Troubleshooting

### Common Issues

**Error: API Key not found**
- Make sure you've set your API key in the environment variables

**Error: Connection timeout**
- Check your network connection
- Verify the API endpoint is accessible

### Getting Help

- Check the [FAQ](./FAQ.md)
- Open an [issue](https://github.com/juspay/shelly/issues)
- Contact support: opensource@juspay.in
