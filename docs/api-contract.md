# API discovery: findings and suggested contract

## What the live API exposes

Observed through GET on 11 November 2026:

```http
GET /v2
{"message":"OK","data":["alert","bins","meross","thermostat","radiator","snowdon","tvcom","wol","hikvision","bthome"]}

GET /v2/meross
{"message":"OK","data":["office","hall_down", "…"]}

GET /v2/meross/office
{"message":"OK","data":{"codes":["toggle","status","luminance","temperature","rgb","fade"]}}

GET /v2/radiator/office
{"message":"OK","data":["toggle","mode","adjust","boost","schedule","status","battery","heatTemp"]}

GET /v2/tvcom/volume
{"message":"OK","data":["0","1","…","100","status"]}
```

Ellipses above abbreviate responses for readability. `/` returns 404; `/v2/alert` returns 405 to GET. `/openapi.json`, `/swagger.json` and `/docs` returned 404.

This is sufficient to discover most of the tree and offer command candidates. It is **not sufficient to fully derive calling conventions or generate reliable typed forms**. In particular:

- An array does not distinguish child resources, device names, command codes and allowed values. The crawler probes child GET routes to distinguish them, which needed 1,101 requests to discover 63 nodes.
- No method or parameter location is declared. The explorer uses the agreed `POST ?code=…` convention, but discovery does not verify it per endpoint.
- Commands such as `rgb`, `fade`, `heatTemp`, `schedule` and `boost` have no argument schema, required fields, units, bounds or examples. It is unclear which accept query parameters or JSON, and what fields they require.
- GET on `/v2/alert` provides no calling information.
- No safe/read-only versus state-changing classification or response schema is advertised.

## Preferred addition: explicit discovery

Either provide OpenAPI 3.1 at `/openapi.json`, including device enumeration, or extend GET discovery to distinguish resources from operations. A single recursively nested manifest would avoid probing every command/numeric value. For a small incremental change, a response **could** look like this (proposal only, not a claim about the current API):

```json
{
  "message": "OK",
  "data": {
    "kind": "device",
    "path": "/v2/meross/office",
    "children": [],
    "operations": [
      {
        "name": "status",
        "method": "POST",
        "path": "/v2/meross/office",
        "changesState": false,
        "parameters": [
          {"name": "code", "in": "query", "required": true,
           "schema": {"type": "string", "const": "status"}}
        ],
        "example": {"query": {"code": "status"}}
      }
    ]
  }
}
```

For operations requiring additional values, explicitly declare their parameter names, location (`query` or JSON request body), JSON types, required fields, range/enumeration, units and example request. For numeric command enums, use `minimum`/`maximum`/`multipleOf` rather than listing every number. Include a response schema, errors and authentication requirements. Ensure GET discovery is side-effect free and includes POST-only routes such as alert. The current crawler intentionally reports unfamiliar schema shapes; if this contract is added, its parser and form renderer should be updated together.

## CORS for a static browser client

Requests tested with `Origin: http://localhost:1313` returned no CORS permission headers. OPTIONS with `Access-Control-Request-Method: POST` and `Access-Control-Request-Headers: authorization,content-type` returned 200 but no `Access-Control-Allow-*` headers. The user subsequently confirmed that a browser POST with `?code=toggle` does change a Meross bulb while response access is blocked. A simple POST without non-safelisted headers can be sent and execute without preflight; CORS still blocks JavaScript from reading its response. By contrast, Authorization or application/json usually causes preflight, and missing permission can prevent the POST itself. Do not treat a fetch rejection as proof the command failed, and do not retry toggles automatically.

See [the separate investigation prompt](cors-investigation-prompt.md) for the API/proxy agent. [MDN’s CORS guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS#simple_requests) explains the simple-request distinction.

For each explicitly allowed frontend origin (localhost during development and the final hosting origin), return:

```http
Access-Control-Allow-Origin: https://your-frontend-origin.example
Vary: Origin
Access-Control-Expose-Headers: WWW-Authenticate, Allow
```

Use the actual allowed requesting origin, including the port. On preflight OPTIONS, also return:

```http
Access-Control-Allow-Methods: GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, Accept
Access-Control-Max-Age: 600
```

Limit methods to those the API actually supports; allow any additional custom headers you intend users to send. OPTIONS must succeed without authentication or device side effects. Include CORS headers on 401, 403, 404 and 5xx responses too. The frontend sends an explicit Basic Authorization header when signed in and omits browser cookies, so `Access-Control-Allow-Credentials` is not required by this implementation. Keep CORS and network/auth access decisions separate: CORS does not authenticate clients.
