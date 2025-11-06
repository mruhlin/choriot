// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util'
import 'whatwg-fetch'

// Polyfill TextEncoder/TextDecoder for edge runtime
global.TextEncoder = TextEncoder
global.TextDecoder = TextDecoder

// Polyfill Response.json for Next.js
if (!Response.json) {
  Response.json = function(data, init) {
    return new Response(JSON.stringify(data), {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...init?.headers,
      },
    })
  }
}
