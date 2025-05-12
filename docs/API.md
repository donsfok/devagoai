
# API Documentation

## Authentication
All API endpoints require authentication token in the header:
```
Authorization: Bearer <your_token>
```

## Endpoints

### Models
- GET /api/models - Get list of available models
- POST /api/models/load - Load new model
- DELETE /api/models/{name} - Remove model

### Chat
- POST /api/chat - Send message to model
- GET /api/chat/history - Get chat history

### Files
- GET /api/files - List files
- POST /api/files - Upload file
- PUT /api/files/{path} - Update file
- DELETE /api/files/{path} - Delete file

## Examples

### Python
```python
import requests

api = "http://your-app/api"
headers = {"Authorization": "Bearer your-token"}

# Get models
response = requests.get(f"{api}/models", headers=headers)
models = response.json()
```

### JavaScript 
```javascript
async function getModels() {
  const response = await fetch('/api/models', {
    headers: {
      'Authorization': 'Bearer your-token'
    }
  });
  return response.json();
}
```
