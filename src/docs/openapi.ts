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
          contentBody: {
            type: 'array',
            nullable: true,
            description: 'Array of content blocks — only populated when resourceType is "article"',
            items: { $ref: '#/components/schemas/ContentBlock' },
          },
        },
      },
      ContentBlock: {
        oneOf: [
          {
            type: 'object',
            properties: { type: { type: 'string', enum: ['heading'] }, level: { type: 'integer', enum: [1, 2, 3] }, text: { type: 'string' } },
          },
          {
            type: 'object',
            properties: { type: { type: 'string', enum: ['paragraph'] }, text: { type: 'string' } },
          },
          {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['image'] },
              url: { type: 'string', format: 'uri' },
              altText: { type: 'string' },
              caption: { type: 'string' },
            },
          },
          {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['file'] },
              url: { type: 'string', format: 'uri' },
              fileName: { type: 'string' },
              mimeType: { type: 'string' },
            },
          },
          {
            type: 'object',
            properties: { type: { type: 'string', enum: ['bullet_list'] }, items: { type: 'array', items: { type: 'string' } } },
          },
        ],
        discriminator: { propertyName: 'type' },
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
      Student: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
          educatorId: { type: 'string', format: 'uuid' },
          enrollmentDate: { type: 'string', format: 'date' },
          academicLevel: { type: 'string', nullable: true },
        },
      },
      EnrollStudentResponse: {
        type: 'object',
        properties: {
          message: { type: 'string' },
          student: { $ref: '#/components/schemas/Student' },
          credentials: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              arqId: { type: 'string' },
              temporaryPassword: { type: 'string', nullable: true, description: 'Only present if no password was supplied at enrollment — share once with the parent/student.' },
            },
          },
        },
      },
      ScheduledSession: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          learningPlanTopicId: { type: 'string', format: 'uuid' },
          scheduledDate: { type: 'string', format: 'date' },
          sessionDayNumber: { type: 'integer' },
          isCompleted: { type: 'boolean' },
          educatorNotes: { type: 'string', nullable: true },
        },
      },
      LearningPlanTopic: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          learningPlanId: { type: 'string', format: 'uuid' },
          topicId: { type: 'string', format: 'uuid' },
          sequenceOrder: { type: 'integer' },
          customDurationDays: { type: 'integer', nullable: true },
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed'] },
          topic: { $ref: '#/components/schemas/Topic' },
          sessions: { type: 'array', items: { $ref: '#/components/schemas/ScheduledSession' } },
        },
      },
      LearningPlan: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', format: 'uuid' },
          educatorId: { type: 'string', format: 'uuid' },
          sessionsPerWeek: { type: 'integer' },
          preferredDays: { type: 'array', items: { type: 'string' } },
          startDate: { type: 'string', format: 'date' },
          endDate: { type: 'string', format: 'date', nullable: true },
          status: { type: 'string', enum: ['active', 'completed', 'paused', 'cancelled'] },
          createdAt: { type: 'string', format: 'date-time' },
          topics: { type: 'array', items: { $ref: '#/components/schemas/LearningPlanTopic' } },
        },
      },
      PricingTier: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          minTopics: { type: 'integer' },
          maxTopics: { type: 'integer', nullable: true },
          priceNaira: { type: 'integer' },
          isActive: { type: 'boolean' },
        },
      },
      Payment: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', format: 'uuid' },
          learningPlanId: { type: 'string', format: 'uuid' },
          pricingTierId: { type: 'string', format: 'uuid' },
          amountNaira: { type: 'integer' },
          status: { type: 'string', enum: ['pending', 'success', 'failed', 'refunded'] },
          provider: { type: 'string', nullable: true },
          providerReference: { type: 'string', nullable: true },
          paidAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      SafeInteractiveElement: {
        type: 'object',
        description: 'Same as InteractiveElement but with correctAnswers stripped — this is what student-facing endpoints return.',
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
        },
      },
      CurrentSessionResponse: {
        type: 'object',
        properties: {
          session: { $ref: '#/components/schemas/ScheduledSession' },
          isOverdue: { type: 'boolean', description: 'True if this session\'s scheduledDate is in the past — student missed a day and must catch up.' },
          topic: { $ref: '#/components/schemas/Topic' },
          learningPlanId: { type: 'string', format: 'uuid' },
          resources: {
            type: 'array',
            items: {
              allOf: [
                { $ref: '#/components/schemas/Resource' },
                { type: 'object', properties: { interactiveElements: { type: 'array', items: { $ref: '#/components/schemas/SafeInteractiveElement' } } } },
              ],
            },
          },
        },
      },
      SubmissionResult: {
        type: 'object',
        properties: {
          isCorrect: { type: 'boolean' },
          scoreAwarded: { type: 'integer' },
          log: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              studentId: { type: 'string', format: 'uuid' },
              interactiveElementId: { type: 'string', format: 'uuid' },
              scheduledSessionId: { type: 'string', format: 'uuid' },
              studentResponse: { type: 'object', additionalProperties: true },
              isCorrect: { type: 'boolean' },
              scoreAwarded: { type: 'integer' },
              submittedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
      PresignedUploadResponse: {
        type: 'object',
        properties: {
          uploadUrl: { type: 'string', format: 'uri', description: 'Signed URL — PUT the raw file here directly, expires in 5 minutes' },
          publicUrl: { type: 'string', format: 'uri', description: 'Permanent public URL to use once the upload completes' },
          key: { type: 'string', description: 'Object key within the R2 bucket' },
        },
      },
      AdminDashboardSummary: {
        type: 'object',
        properties: {
          educators: {
            type: 'object',
            properties: { total: { type: 'integer' }, pendingApproval: { type: 'integer' }, approved: { type: 'integer' } },
          },
          students: { type: 'object', properties: { total: { type: 'integer' } } },
          curriculum: {
            type: 'object',
            properties: { subjects: { type: 'integer' }, classes: { type: 'integer' }, topics: { type: 'integer' }, resources: { type: 'integer' } },
          },
          payments: {
            type: 'object',
            properties: {
              totalRevenueNaira: { type: 'integer' },
              pending: { type: 'integer' },
              successful: { type: 'integer' },
              failed: { type: 'integer' },
            },
          },
          todaysActivity: {
            type: 'object',
            properties: { totalSessionsScheduled: { type: 'integer' }, completed: { type: 'integer' }, remaining: { type: 'integer' } },
          },
        },
      },
      EducatorDashboardSummary: {
        type: 'object',
        properties: {
          students: { type: 'object', properties: { total: { type: 'integer' } } },
          learningPlans: { type: 'object', properties: { total: { type: 'integer' }, active: { type: 'integer' } } },
          payments: {
            type: 'object',
            properties: { pending: { type: 'integer' }, successful: { type: 'integer' }, totalCollectedNaira: { type: 'integer' } },
          },
          todaysActivity: {
            type: 'object',
            properties: { totalSessionsScheduled: { type: 'integer' }, completed: { type: 'integer' }, remaining: { type: 'integer' } },
          },
        },
      },
      StudentDashboardSummary: {
        type: 'object',
        properties: {
          currentSession: { $ref: '#/components/schemas/CurrentSessionResponse' },
          progress: {
            type: 'object',
            properties: { totalTopics: { type: 'integer' }, completedTopics: { type: 'integer' }, percentComplete: { type: 'integer' } },
          },
          payments: {
            type: 'object',
            properties: { hasPendingPayment: { type: 'boolean' }, hasSuccessfulPayment: { type: 'boolean' } },
          },
          performance: {
            type: 'object',
            properties: {
              totalSubmissions: { type: 'integer' },
              correctSubmissions: { type: 'integer' },
              accuracyPercent: { type: 'integer' },
              averageScore: { type: 'integer' },
            },
          },
        },
      },
      StudentReport: {
        type: 'object',
        properties: {
          student: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              academicLevel: { type: 'string', nullable: true },
              enrollmentDate: { type: 'string', format: 'date' },
            },
          },
          learningPlans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                planId: { type: 'string', format: 'uuid' },
                status: { type: 'string' },
                startDate: { type: 'string', format: 'date' },
                paymentStatus: { type: 'string' },
                topics: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      topicTitle: { type: 'string' },
                      status: { type: 'string' },
                      totalSessions: { type: 'integer' },
                      completedSessions: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
          assessmentSummary: {
            type: 'object',
            properties: {
              totalSubmissions: { type: 'integer' },
              correctSubmissions: { type: 'integer' },
              accuracyPercent: { type: 'integer' },
              averageScore: { type: 'integer' },
              byInteractionType: {
                type: 'object',
                additionalProperties: { type: 'object', properties: { total: { type: 'integer' }, correct: { type: 'integer' } } },
              },
            },
          },
        },
      },
      StudentMiniProfile: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          arqId: { type: 'string' },
          academicLevel: { type: 'string', nullable: true },
          enrollmentDate: { type: 'string', format: 'date' },
        },
      },
      EducatorProfileWithStudents: {
        type: 'object',
        properties: {
          educator: { $ref: '#/components/schemas/Educator' },
          accountStatus: { type: 'object', properties: { active: { type: 'boolean' }, verified: { type: 'boolean' } }, nullable: true },
          students: { type: 'array', items: { $ref: '#/components/schemas/StudentMiniProfile' } },
          totalStudents: { type: 'integer' },
        },
      },
      StudentLearningHistory: {
        type: 'object',
        properties: {
          student: { $ref: '#/components/schemas/StudentMiniProfile' },
          learningPlans: {
            type: 'array',
            items: {
              allOf: [{ $ref: '#/components/schemas/LearningPlan' }, { type: 'object', properties: { isPaid: { type: 'boolean' } } }],
            },
          },
        },
      },
      LearningPlanBreakdown: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            planId: { type: 'string', format: 'uuid' },
            status: { type: 'string' },
            startDate: { type: 'string', format: 'date' },
            topics: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  topicId: { type: 'string', format: 'uuid' },
                  topicTitle: { type: 'string' },
                  status: { type: 'string' },
                  done: { type: 'array', items: { $ref: '#/components/schemas/ScheduledSession' } },
                  todo: { type: 'array', items: { $ref: '#/components/schemas/ScheduledSession' } },
                },
              },
            },
          },
        },
      },
      AssessmentActivityItem: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          studentId: { type: 'string', format: 'uuid' },
          studentName: { type: 'string', nullable: true, description: 'Only present on the admin system-wide feed' },
          interactiveElementId: { type: 'string', format: 'uuid' },
          scheduledSessionId: { type: 'string', format: 'uuid' },
          interactionType: { type: 'string' },
          resourceTitle: { type: 'string', nullable: true },
          topicTitle: { type: 'string', nullable: true },
          studentResponse: { type: 'object', additionalProperties: true },
          isCorrect: { type: 'boolean' },
          scoreAwarded: { type: 'integer' },
          submittedAt: { type: 'string', format: 'date-time' },
        },
      },
      AssessmentStats: {
        type: 'object',
        properties: {
          totalSubmissions: { type: 'integer' },
          correctSubmissions: { type: 'integer' },
          accuracyPercent: { type: 'integer' },
          averageScore: { type: 'integer' },
        },
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

    // ================= EDUCATOR: STUDENT ENROLLMENT =================
    '/api/educators/students': {
      post: {
        summary: 'Enroll a new student under the logged-in (approved) educator',
        tags: ['Educator - Students'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['firstName', 'lastName', 'email'],
                properties: {
                  firstName: { type: 'string' },
                  lastName: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  academicLevel: { type: 'string' },
                  password: { type: 'string', minLength: 6, description: 'Omit to auto-generate a temporary password' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Student enrolled', content: { 'application/json': { schema: { $ref: '#/components/schemas/EnrollStudentResponse' } } } },
          '400': { description: 'Email already registered', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
          '403': { description: 'Educator not yet approved' },
        },
      },
      get: {
        summary: 'List students belonging to the logged-in educator',
        tags: ['Educator - Students'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'List of students', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Student' } } } } } },
      },
    },
    '/api/educators/students/{id}': {
      get: {
        summary: 'Get one of my students by ID',
        tags: ['Educator - Students'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Student', content: { 'application/json': { schema: { $ref: '#/components/schemas/Student' } } } }, '404': { description: 'Not found' } },
      },
    },

    // ================= EDUCATOR: LEARNING PLANS =================
    '/api/educators/learning-plans': {
      post: {
        summary: 'Build a custom learning plan for one of my students (auto-generates the session calendar)',
        tags: ['Educator - Learning Plans'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['studentId', 'sessionsPerWeek', 'preferredDays', 'startDate', 'topics'],
                properties: {
                  studentId: { type: 'string', format: 'uuid' },
                  sessionsPerWeek: { type: 'integer', minimum: 1, maximum: 7 },
                  preferredDays: {
                    type: 'array',
                    items: { type: 'string', enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] },
                  },
                  startDate: { type: 'string', format: 'date' },
                  topics: {
                    type: 'array',
                    items: {
                      type: 'object',
                      required: ['topicId'],
                      properties: {
                        topicId: { type: 'string', format: 'uuid' },
                        customDurationDays: { type: 'integer', description: 'Override the topic\'s default expectedDurationDays' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Learning plan created with full generated schedule', content: { 'application/json': { schema: { $ref: '#/components/schemas/LearningPlan' } } } },
          '404': { description: 'Student not found, or does not belong to you' },
        },
      },
    },
    '/api/educators/learning-plans/{id}': {
      get: {
        summary: 'Get a learning plan with its full topic + schedule breakdown',
        tags: ['Educator - Learning Plans'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Learning plan', content: { 'application/json': { schema: { $ref: '#/components/schemas/LearningPlan' } } } }, '404': { description: 'Not found' } },
      },
    },
    '/api/educators/learning-plans/student/{studentId}': {
      get: {
        summary: 'List all learning plans for a specific student of mine',
        tags: ['Educator - Learning Plans'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'studentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'List of learning plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/LearningPlan' } } } } } },
      },
    },

    // ================= STUDENT AUTH =================
    '/api/students/login': {
      post: {
        summary: 'Student login — sets HTTP-only cookie',
        tags: ['Student Auth'],
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
    '/api/students/me': {
      get: {
        summary: 'Get current student profile',
        tags: ['Student Auth'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Student profile data' }, '401': { description: 'Unauthorized' } },
      },
    },

    // ================= PAYMENTS =================
    '/api/students/payments/initiate': {
      post: {
        summary: 'Initiate payment for a learning plan (price auto-computed from topic count via pricing tiers)',
        tags: ['Payments'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { type: 'object', required: ['learningPlanId'], properties: { learningPlanId: { type: 'string', format: 'uuid' } } },
            },
          },
        },
        responses: {
          '201': {
            description: 'Payment initiated — currently requires manual admin approval',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    message: { type: 'string' },
                    payment: { $ref: '#/components/schemas/Payment' },
                    redirectUrl: { type: 'string', nullable: true, description: 'Null under the manual provider; populated once GafiaPay is wired in' },
                  },
                },
              },
            },
          },
          '200': { description: 'A payment for this plan already exists' },
          '404': { description: 'Learning plan not found' },
        },
      },
    },
    '/api/students/payments/me': {
      get: {
        summary: 'List the logged-in student\'s own payment history',
        tags: ['Payments'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'List of payments for this student',
            content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } },
          },
          '404': { description: 'Student profile not found' },
        },
      },
    },
    '/api/admin/payments/pending': {
      get: {
        summary: 'List payments awaiting manual approval',
        tags: ['Admin - Payments'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'List of pending payments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } },
      },
    },
    '/api/admin/payments': {
      get: {
        summary: 'List all payments',
        tags: ['Admin - Payments'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'List of all payments', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/Payment' } } } } } },
      },
    },
    '/api/admin/payments/{id}/approve': {
      patch: {
        summary: 'Manually approve a payment (e.g. after confirming a bank transfer) — unlocks the student\'s learning plan',
        tags: ['Admin - Payments'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Payment approved', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } }, '404': { description: 'Not found' } },
      },
    },
    '/api/admin/payments/{id}/reject': {
      patch: {
        summary: 'Reject a payment',
        tags: ['Admin - Payments'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: { '200': { description: 'Payment rejected', content: { 'application/json': { schema: { $ref: '#/components/schemas/Payment' } } } }, '404': { description: 'Not found' } },
      },
    },

    // ================= STUDENT DAILY WORKFLOW =================
    '/api/students/me/current-session': {
      get: {
        summary: 'Get the student\'s current active session — always the earliest incomplete one (enforces catch-up if a day was missed)',
        tags: ['Student - Daily Workflow'],
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Current session with resources and interactive elements (correctAnswers stripped)', content: { 'application/json': { schema: { $ref: '#/components/schemas/CurrentSessionResponse' } } } },
        },
      },
    },
    '/api/students/me/sessions/{sessionId}/complete': {
      post: {
        summary: 'Mark the current session complete — unlocks the next scheduled day',
        tags: ['Student - Daily Workflow'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'sessionId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Session marked complete', content: { 'application/json': { schema: { type: 'object', properties: { message: { type: 'string' }, session: { $ref: '#/components/schemas/ScheduledSession' } } } } } },
          '400': { description: 'This is not the student\'s current session, or it is already completed' },
        },
      },
    },
    '/api/students/me/submissions': {
      post: {
        summary: 'Submit a response to an interactive element for grading',
        tags: ['Student - Daily Workflow'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['interactiveElementId', 'scheduledSessionId', 'response'],
                properties: {
                  interactiveElementId: { type: 'string', format: 'uuid' },
                  scheduledSessionId: { type: 'string', format: 'uuid' },
                  response: { type: 'object', additionalProperties: true, description: 'Raw student answer payload, shape matches the element\'s configSchema' },
                },
              },
            },
          },
        },
        responses: { '200': { description: 'Graded submission result', content: { 'application/json': { schema: { $ref: '#/components/schemas/SubmissionResult' } } } } },
      },
    },

    // ================= FILE UPLOADS (R2) =================
    '/api/admin/files/presigned-upload-url': {
      post: {
        summary: 'Get a presigned R2 upload URL — upload the file directly to the returned uploadUrl, then use publicUrl in your content',
        tags: ['Files'],
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['fileName', 'contentType'],
                properties: {
                  fileName: { type: 'string', example: 'banner.jpg' },
                  contentType: { type: 'string', example: 'image/jpeg' },
                  folder: { type: 'string', enum: ['articles', 'interactive-elements', 'resources', 'misc'], default: 'misc' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Presigned upload details', content: { 'application/json': { schema: { $ref: '#/components/schemas/PresignedUploadResponse' } } } },
        },
      },
    },

    // ================= DASHBOARDS =================
    '/api/admin/dashboard/summary': {
      get: {
        summary: 'Admin dashboard — system-wide counts, payments, and today\'s activity',
        tags: ['Dashboards'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Admin dashboard summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/AdminDashboardSummary' } } } } },
      },
    },
    '/api/educators/dashboard/summary': {
      get: {
        summary: 'Educator dashboard — own students, plans, payments, and today\'s activity',
        tags: ['Dashboards'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Educator dashboard summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/EducatorDashboardSummary' } } } } },
      },
    },
    '/api/students/me/dashboard': {
      get: {
        summary: 'Student dashboard — current session, progress, payment status, performance',
        tags: ['Dashboards'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Student dashboard summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentDashboardSummary' } } } } },
      },
    },

    // ================= REPORTS / ASSESSMENTS =================
    '/api/admin/students/{studentId}/report': {
      get: {
        summary: 'Full assessment report for any student (admin access)',
        tags: ['Reports'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'studentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Student report', content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentReport' } } } },
          '404': { description: 'Student not found' },
        },
      },
    },
    '/api/educators/students/{studentId}/report': {
      get: {
        summary: 'Full assessment report for one of my students (educator access)',
        tags: ['Reports'],
        security: [{ cookieAuth: [] }],
        parameters: [{ name: 'studentId', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          '200': { description: 'Student report', content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentReport' } } } },
          '404': { description: 'Student not found, or does not belong to you' },
        },
      },
    },
    '/api/students/me/report': {
      get: {
        summary: 'Full assessment report for the logged-in student (self access)',
        tags: ['Reports'],
        security: [{ cookieAuth: [] }],
        responses: { '200': { description: 'Own student report', content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentReport' } } } } },
      },
    },

    '/health': {
      get: { summary: 'Health check', tags: ['System'], responses: { '200': { description: 'OK' } } },
    },
  },
};