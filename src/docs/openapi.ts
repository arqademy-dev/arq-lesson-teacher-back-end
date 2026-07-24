export const openApiDocument = {
  openapi: '3.0.0',
  info: { title: 'Arqademy Lesson Teacher API', version: '1.0.0' },
  paths: {
    '/api/users/register': {
      post: {
        summary: 'Register as an Educator',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'firstName', 'lastName'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', minLength: 6 },
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Educator registered',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' }, arqId: { type: 'string' } } },
              },
            },
          },
        },
      },
    },
    '/api/users/login': {
      post: {
        summary: 'Log in and receive HTTP-Only cookie',
        tags: ['Auth'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: { email: { type: 'string', format: 'email' }, password: { type: 'string' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Login successful' } },
      },
    },
    '/api/users/logout': {
      post: { summary: 'Logout', tags: ['Auth'], responses: { '200': { description: 'Logged out' } } },
    },
    '/api/users/me': {
      get: {
        summary: 'Get current profile',
        tags: ['Auth'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Profile data' } },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
  },
};