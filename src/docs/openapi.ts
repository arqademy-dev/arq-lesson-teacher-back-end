export const openApiDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Arqademy Lesson Teacher API',
    version: '1.0.0',
    description: 'Individualised LMS backend — educator/student auth, admin curriculum management, and interactive learning delivery.',
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' },
    },
    schemas: {
      Subject: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdByAdminId: { type: 'string', format: 'uuid' },
        },
      },
      Class: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          subjectId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          term: { type: 'string', nullable: true },
          isActive: { type: 'boolean' },
        },
      },
      Topic: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          classId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          sortOrder: { type: 'integer' },
          expectedDurationDays: { type: 'integer' },
        },
      },
      Resource: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          topicId: { type: 'string', format: 'uuid' },
          title: { type: 'string' },
          resourceType: { type: 'string', enum: ['video', 'pdf', 'article', 'image', 'interactive', 'quiz'] },
          urlOrPath: { type: 'string' },
          dayNumber: { type: 'integer' },
          sortOrder: { type: 'integer' },
        },
      },
      InteractiveElement: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          resourceId: { type: 'string', format: 'uuid' },
          interactionType: {
            type: 'string',
            enum: ['drag_and_drop', 'fill_blank', 'hotspot', 'branching', 'interactive_video', 'image_sequencing', 'multiple_choice'],
          },
          videoTimestampSeconds: { type: 'integer', nullable: true },
          pauseOnTrigger: { type: 'boolean' },
          configSchema: { type: 'object', additionalProperties: true },
          correctAnswers: { type: 'object', additionalProperties: true, description: 'Admin-only field. Never returned on student-facing endpoints.' },
        },
      },
      Educator: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          arqId: { type: 'string' },
          accountApproval: { type: 'string', enum: ['approve', 'pending', 'closed', 'suspended'] },
          specialization: { type: 'string', nullable: true },
          bio: { type: 'string', nullable: true },
          hiredDate: { type: 'string', format: 'date', nullable: true },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      ErrorResponse: {
        type: 'object',
        properties: { message: { type: 'string' } },
      },
    },
  },
  paths: {
    // ================= EDUCATOR AUTH =================
    '/api/users/register': {
      post: {
        summary: 'Register as an Educator',
        tags: ['Educator Auth'],
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
            description: 'Educator registered, pending admin approval',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { message: { type: 'string' }, arqId: { type: 'string' } } },
              },
            },
          },
          '400': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/users/login': {
      post: {
        summary: 'Educator login — sets HTTP-only cookie',
        tags: ['Educator Auth'],
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
        responses: {
          '200': { description: 'Login successful' },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/users/logout': {
      post: { summary: 'Educator logout', tags: ['Educator Auth'], responses: { '200': { description: 'Logged out' } } },
    },
    '/api/users/me': {
      get: {
        summary: 'Get current educator profile',
        tags: ['Educator Auth'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Educator profile data' }, '401': { description: 'Unauthorized' } },
      },
    },

    // ================= ADMIN AUTH & EDUCATOR APPROVAL =================
    '/api/admin/login': {
      post: {
        summary: 'Admin login — sets HTTP-only cookie',
        tags: ['Admin Auth'],
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
        responses: {
          '200': { description: 'Admin login successful' },
          '401': { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
        },
      },
    },
    '/api/admin/educators/pending': {
      get: {
        summary: 'List educators awaiting approval',
        tags: ['Admin - Educators'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'List of pending educators', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Educator' } } } } },
          '403': { description: 'Forbidden — admin role required' },
        },
      },
    },
    '/api/admin/educators': {
      get: {
        summary: 'List all educators',
        tags: ['Admin - Educators'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'List of all educators', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Educator' } } } } },
        },
      },
    },
    '/api/admin/educators/{educatorId}/approval': {
      patch: {
        summary: 'Approve, suspend, or close an educator account',
        tags: ['Admin - Educators'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'educatorId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['action'], properties: { action: { type: 'string', enum: ['approve', 'suspend', 'close'] } } },
            },
          },
        },
        responses: {
          '200': { description: 'Educator approval status updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Educator' } } } },
          '404': { description: 'Educator not found' },
        },
      },
    },

    // ================= CURRICULUM: SUBJECTS =================
    '/api/admin/curriculum/subjects': {
      post: {
        summary: 'Create a subject',
        tags: ['Curriculum - Subjects'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, description: { type: 'string' } } } } },
        },
        responses: { '201': { description: 'Subject created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } } } },
      },
      get: {
        summary: 'List all subjects',
        tags: ['Curriculum - Subjects'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'List of subjects', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Subject' } } } } } },
      },
    },
    '/api/admin/curriculum/subjects/{id}': {
      get: {
        summary: 'Get a subject by ID',
        tags: ['Curriculum - Subjects'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Subject', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } } }, '404': { description: 'Not found' } },
      },
      patch: {
        summary: 'Update a subject',
        tags: ['Curriculum - Subjects'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, description: { type: 'string' } } } } } },
        responses: { '200': { description: 'Updated subject', content: { 'application/json': { schema: { $ref: '#/components/schemas/Subject' } } } } },
      },
      delete: {
        summary: 'Delete a subject (cascades to classes/topics/resources)',
        tags: ['Curriculum - Subjects'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Subject deleted' }, '404': { description: 'Not found' } },
      },
    },

    // ================= CURRICULUM: CLASSES =================
    '/api/admin/curriculum/subjects/{subjectId}/classes': {
      post: {
        summary: 'Create a class under a subject',
        tags: ['Curriculum - Classes'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'subjectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { type: 'object', required: ['title'], properties: { title: { type: 'string' }, term: { type: 'string' }, isActive: { type: 'boolean' } } } } },
        },
        responses: { '201': { description: 'Class created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Class' } } } } },
      },
      get: {
        summary: 'List classes under a subject',
        tags: ['Curriculum - Classes'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'subjectId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of classes', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Class' } } } } } },
      },
    },
    '/api/admin/curriculum/classes/{id}': {
      get: {
        summary: 'Get a class by ID',
        tags: ['Curriculum - Classes'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Class', content: { 'application/json': { schema: { $ref: '#/components/schemas/Class' } } } } },
      },
      patch: {
        summary: 'Update a class',
        tags: ['Curriculum - Classes'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { title: { type: 'string' }, term: { type: 'string' }, isActive: { type: 'boolean' } } } } } },
        responses: { '200': { description: 'Updated class', content: { 'application/json': { schema: { $ref: '#/components/schemas/Class' } } } } },
      },
      delete: {
        summary: 'Delete a class (cascades to topics/resources)',
        tags: ['Curriculum - Classes'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Class deleted' } },
      },
    },

    // ================= CURRICULUM: TOPICS =================
    '/api/admin/curriculum/classes/{classId}/topics': {
      post: {
        summary: 'Create a topic under a class',
        tags: ['Curriculum - Topics'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'classId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'sortOrder', 'expectedDurationDays'],
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' },
                  sortOrder: { type: 'integer' },
                  expectedDurationDays: { type: 'integer', description: 'Number of days this topic takes to complete' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Topic created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Topic' } } } } },
      },
      get: {
        summary: 'List topics under a class',
        tags: ['Curriculum - Topics'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'classId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of topics', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Topic' } } } } } },
      },
    },
    '/api/admin/curriculum/topics/{id}': {
      get: {
        summary: 'Get a topic by ID',
        tags: ['Curriculum - Topics'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Topic', content: { 'application/json': { schema: { $ref: '#/components/schemas/Topic' } } } } },
      },
      patch: {
        summary: 'Update a topic',
        tags: ['Curriculum - Topics'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: { title: { type: 'string' }, description: { type: 'string' }, sortOrder: { type: 'integer' }, expectedDurationDays: { type: 'integer' } },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated topic', content: { 'application/json': { schema: { $ref: '#/components/schemas/Topic' } } } } },
      },
      delete: {
        summary: 'Delete a topic (cascades to resources)',
        tags: ['Curriculum - Topics'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Topic deleted' } },
      },
    },

    // ================= CURRICULUM: RESOURCES =================
    '/api/admin/curriculum/topics/{topicId}/resources': {
      post: {
        summary: 'Create a resource under a topic',
        tags: ['Curriculum - Resources'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'topicId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'resourceType', 'urlOrPath', 'dayNumber', 'sortOrder'],
                properties: {
                  title: { type: 'string' },
                  resourceType: { type: 'string', enum: ['video', 'pdf', 'article', 'image', 'interactive', 'quiz'] },
                  urlOrPath: { type: 'string' },
                  dayNumber: { type: 'integer', description: 'Which day within the topic this resource belongs to' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Resource created', content: { 'application/json': { schema: { $ref: '#/components/schemas/Resource' } } } } },
      },
      get: {
        summary: 'List resources under a topic',
        tags: ['Curriculum - Resources'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'topicId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of resources', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Resource' } } } } } },
      },
    },
    '/api/admin/curriculum/resources/{id}': {
      get: {
        summary: 'Get a resource by ID',
        tags: ['Curriculum - Resources'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Resource', content: { 'application/json': { schema: { $ref: '#/components/schemas/Resource' } } } } },
      },
      patch: {
        summary: 'Update a resource',
        tags: ['Curriculum - Resources'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  resourceType: { type: 'string', enum: ['video', 'pdf', 'article', 'image', 'interactive', 'quiz'] },
                  urlOrPath: { type: 'string' },
                  dayNumber: { type: 'integer' },
                  sortOrder: { type: 'integer' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated resource', content: { 'application/json': { schema: { $ref: '#/components/schemas/Resource' } } } } },
      },
      delete: {
        summary: 'Delete a resource (cascades to interactive elements)',
        tags: ['Curriculum - Resources'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Resource deleted' } },
      },
    },

    // ================= INTERACTIVE ELEMENTS =================
    '/api/admin/curriculum/resources/{resourceId}/interactive-elements': {
      post: {
        summary: 'Attach an interactive element to a resource (video pop-up, quiz question, hotspot, etc.)',
        tags: ['Curriculum - Interactive Elements'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'resourceId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['interactionType', 'configSchema', 'correctAnswers'],
                properties: {
                  interactionType: {
                    type: 'string',
                    enum: ['drag_and_drop', 'fill_blank', 'hotspot', 'branching', 'interactive_video', 'image_sequencing', 'multiple_choice'],
                  },
                  videoTimestampSeconds: { type: 'integer', description: 'Only used when interactionType is interactive_video' },
                  pauseOnTrigger: { type: 'boolean' },
                  configSchema: { type: 'object', additionalProperties: true, description: 'Open-ended layout JSON the frontend renders dynamically' },
                  correctAnswers: { type: 'object', additionalProperties: true, description: 'Server-side ground truth, never returned to students' },
                },
              },
            },
          },
        },
        responses: { '201': { description: 'Interactive element created', content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractiveElement' } } } } },
      },
      get: {
        summary: 'List interactive elements attached to a resource',
        tags: ['Curriculum - Interactive Elements'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'resourceId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'List of interactive elements', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/InteractiveElement' } } } } },
        },
      },
    },
    '/api/admin/curriculum/interactive-elements/{id}': {
      get: {
        summary: 'Get an interactive element by ID',
        tags: ['Curriculum - Interactive Elements'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Interactive element', content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractiveElement' } } } } },
      },
      patch: {
        summary: 'Update an interactive element',
        tags: ['Curriculum - Interactive Elements'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  interactionType: {
                    type: 'string',
                    enum: ['drag_and_drop', 'fill_blank', 'hotspot', 'branching', 'interactive_video', 'image_sequencing', 'multiple_choice'],
                  },
                  videoTimestampSeconds: { type: 'integer' },
                  pauseOnTrigger: { type: 'boolean' },
                  configSchema: { type: 'object', additionalProperties: true },
                  correctAnswers: { type: 'object', additionalProperties: true },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Updated interactive element', content: { 'application/json': { schema: { $ref: '#/components/schemas/InteractiveElement' } } } } },
      },
      delete: {
        summary: 'Delete an interactive element',
        tags: ['Curriculum - Interactive Elements'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Interactive element deleted' } },
      },
    },

    '/health': {
      get: { summary: 'Health check', tags: ['System'], responses: { '200': { description: 'OK' } } },
    },
  },
};