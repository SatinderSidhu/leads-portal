# Leads Portal — API Integration Guide

**Version:** 1.0
**Last Updated:** March 6, 2026

## Overview

The Leads Portal provides a REST API for external systems (e.g., Business Development Lead Generation Agents) to programmatically create leads. Leads created via the API are tagged with `source: "AGENT"` to distinguish them from manually entered leads.

> **Note:** The API does not send any emails to customers. Email communication is managed by the admin through the portal UI.

---

## Base URL

```
https://<your-admin-domain>/api/v1
```

For local development:
```
http://localhost:3000/api/v1
```

---

## Authentication

All API requests require a **Bearer token** in the `Authorization` header.

```
Authorization: Bearer <API_TOKEN>
```

The token is configured via the `API_TOKEN` environment variable on the server. Contact the admin to obtain your token.

### Authentication Errors

| Status | Response |
|--------|----------|
| `401`  | `{ "error": "Unauthorized. Provide a valid Bearer token in the Authorization header." }` |

---

## Endpoints

### Create Lead

**`POST /api/v1/leads`**

Creates a new lead in the system with `source: "AGENT"` and initial status `NEW`.

#### Request Headers

| Header          | Value                    | Required |
|-----------------|--------------------------|----------|
| `Authorization` | `Bearer <API_TOKEN>`     | Yes      |
| `Content-Type`  | `application/json`       | Yes      |

#### Request Body

| Field                | Type     | Required | Description                                      |
|----------------------|----------|----------|--------------------------------------------------|
| `projectName`        | `string` | Yes      | Name of the project or opportunity                |
| `customerName`       | `string` | Yes      | Full name of the customer / prospect              |
| `customerEmail`      | `string` | Yes      | Customer's email address (must be valid format)   |
| `projectDescription` | `string` | Yes      | Detailed description of the project requirements  |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/v1/leads \
  -H "Authorization: Bearer lp_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6" \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Mobile Banking App",
    "customerName": "Jane Smith",
    "customerEmail": "jane.smith@example.com",
    "projectDescription": "A mobile banking application with features including account management, fund transfers, bill payments, and real-time notifications. Target platforms: iOS and Android."
  }'
```

#### Success Response

**Status: `201 Created`**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "projectName": "Mobile Banking App",
  "customerName": "Jane Smith",
  "customerEmail": "jane.smith@example.com",
  "projectDescription": "A mobile banking application with features including account management, fund transfers, bill payments, and real-time notifications. Target platforms: iOS and Android.",
  "source": "AGENT",
  "status": "NEW",
  "createdAt": "2026-03-06T10:30:00.000Z"
}
```

#### Error Responses

**Status: `400 Bad Request` — Validation Error**

```json
{
  "error": "Validation failed",
  "details": [
    "projectName is required",
    "customerEmail must be a valid email address"
  ]
}
```

**Status: `400 Bad Request` — Invalid JSON**

```json
{
  "error": "Invalid JSON body"
}
```

**Status: `401 Unauthorized`**

```json
{
  "error": "Unauthorized. Provide a valid Bearer token in the Authorization header."
}
```

**Status: `500 Internal Server Error`**

```json
{
  "error": "Internal server error"
}
```

---

## Field Mapping Reference

Use this table to map your agent's data fields to the API fields:

| API Field            | Description                           | Constraints                  |
|----------------------|---------------------------------------|------------------------------|
| `projectName`        | Project or opportunity name           | Non-empty string             |
| `customerName`       | Prospect's full name                  | Non-empty string             |
| `customerEmail`      | Prospect's email address              | Valid email format            |
| `projectDescription` | Project scope and requirements        | Non-empty string             |

---

## Lead Lifecycle

Once a lead is created via the API:

1. Lead is created with `status: "NEW"` and `source: "AGENT"`
2. No email is sent to the customer
3. Admin reviews the lead in the portal dashboard
4. Admin can update status, add notes, generate NDA, and send emails as needed

---

## Rate Limits

There are currently no rate limits enforced. Please use reasonable request rates.

---

## Code Examples

### Python

```python
import requests

API_URL = "http://localhost:3000/api/v1/leads"
API_TOKEN = "lp_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"

response = requests.post(
    API_URL,
    headers={
        "Authorization": f"Bearer {API_TOKEN}",
        "Content-Type": "application/json",
    },
    json={
        "projectName": "E-Commerce Platform",
        "customerName": "John Doe",
        "customerEmail": "john@example.com",
        "projectDescription": "Full-stack e-commerce platform with product catalog, shopping cart, and payment integration.",
    },
)

if response.status_code == 201:
    lead = response.json()
    print(f"Lead created: {lead['id']}")
else:
    print(f"Error: {response.json()}")
```

### JavaScript / Node.js

```javascript
const response = await fetch("http://localhost:3000/api/v1/leads", {
  method: "POST",
  headers: {
    "Authorization": "Bearer lp_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    projectName: "E-Commerce Platform",
    customerName: "John Doe",
    customerEmail: "john@example.com",
    projectDescription: "Full-stack e-commerce platform with product catalog, shopping cart, and payment integration.",
  }),
});

const data = await response.json();
if (response.ok) {
  console.log("Lead created:", data.id);
} else {
  console.error("Error:", data);
}
```
