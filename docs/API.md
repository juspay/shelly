# API Documentation

> API reference for @juspay/shelly

## Overview

This document provides comprehensive API documentation for @juspay/shelly.

## Base URL

```
https://api.shelly.com/v1
```

## Authentication

All API requests require authentication using API keys.

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://api.shelly.com/v1/endpoint
```

## Endpoints

### GET /status

Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "version": "{{version}}",
  "timestamp": "2023-01-01T00:00:00Z"
}
```

### Main function for shelly

Main API endpoint for shelly functionality.

**Parameters:**
- `param1` (string): Description of parameter
- `param2` (number): Description of parameter

**Response:**
```json
{
  "success": true,
  "data": {},
  "message": "Operation completed successfully"
}
```

## Error Handling

All errors return a consistent format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

## Rate Limiting

API calls are limited to 1000 requests per hour per API key.

## Examples

### JavaScript/Node.js

```javascript
const shelly = require('@juspay/shelly');

// Example usage
const result = await shelly.method();
console.log(result);
```

### Python

```python
import shelly

# Example usage
result = shelly.method()
print(result)
```

## Support

For API support, contact: opensource@juspay.in
