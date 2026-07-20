import { Router, Request, Response } from 'express';

const router = Router();

const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "EcoTrack Hyderabad Pilot API",
    description: "Robust, Secure, and Audited Municipal Waste Management Platform backend services API. Featuring multi-tier Role-Based Access Control (RBAC) protecting all endpoints.",
    version: "1.0.0",
    contact: {
      name: "EcoTrack Support",
      email: "support@ecotrack.hyderabad.gov"
    }
  },
  servers: [
    {
      url: "/api",
      description: "Local API gateway"
    }
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Firebase ID Token or developer fallback session token."
      }
    },
    schemas: {
      UserProfile: {
        type: "object",
        properties: {
          uid: { type: "string" },
          fullName: { type: "string" },
          email: { type: "string" },
          role: { type: "string", enum: ["citizen", "collector", "admin", "super_admin"] },
          area: { type: "string" },
          phone: { type: "string" },
          points: { type: "integer" },
          status: { type: "string", enum: ["active", "disabled"] }
        }
      },
      BinReport: {
        type: "object",
        properties: {
          reportId: { type: "string" },
          userId: { type: "string" },
          imageUrl: { type: "string" },
          latitude: { type: "number" },
          longitude: { type: "number" },
          address: { type: "string" },
          status: { type: "string", enum: ["reported", "acknowledged", "collected", "invalid"] },
          severity: { type: "string", enum: ["full", "overflowing", "damaged", "illegal-dumping"] },
          upvotes: { type: "integer" },
          reporterName: { type: "string" }
        }
      },
      CollectionSchedule: {
        type: "object",
        properties: {
          scheduleId: { type: "string" },
          areaName: { type: "string" },
          city: { type: "string" },
          wasteType: { type: "string", enum: ["organic", "recyclable", "general", "mixed"] },
          collectorId: { type: "string" },
          daysOfWeek: { type: "array", items: { type: "string" } },
          timeWindow: { type: "string" },
          active: { type: "boolean" }
        }
      },
      Reward: {
        type: "object",
        properties: {
          rewardId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          pointsCost: { type: "integer" },
          partner: { type: "string" },
          stock: { type: "integer" },
          imageUrl: { type: "string" }
        }
      }
    }
  },
  security: [
    {
      BearerAuth: []
    }
  ],
  paths: {
    "/auth/register": {
      post: {
        summary: "Register new user profile",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["fullName", "email", "area", "phone"],
                properties: {
                  fullName: { type: "string", minLength: 2 },
                  email: { type: "string" },
                  area: { type: "string" },
                  phone: { type: "string" }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Registered successfully" },
          400: { description: "Validation error" }
        }
      }
    },
    "/auth/profile": {
      get: {
        summary: "Get current user profile (Session Restoration)",
        tags: ["Authentication"],
        responses: {
          200: { description: "Active session returned" },
          401: { description: "Missing/invalid credentials" }
        }
      }
    },
    "/auth/send-verification": {
      post: {
        summary: "Send Email Verification link",
        tags: ["Authentication"],
        responses: {
          200: { description: "Verification link sent successfully" }
        }
      }
    },
    "/auth/verify-email": {
      post: {
        summary: "Verify Email Status manually",
        tags: ["Authentication"],
        responses: {
          200: { description: "Email status synchronized" }
        }
      }
    },
    "/auth/forgot-password": {
      post: {
        summary: "Request Password Reset Link",
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email"],
                properties: { email: { type: "string" } }
              }
            }
          }
        },
        responses: {
          200: { description: "Reset link generated successfully" }
        }
      }
    },
    "/auth/reset-password": {
      post: {
        summary: "Reset Password via ID and credentials",
        tags: ["Authentication"],
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["uid", "password"],
                properties: {
                  uid: { type: "string" },
                  password: { type: "string", minLength: 6 }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Password reset completed" }
        }
      }
    },
    "/auth/logout": {
      post: {
        summary: "Secure Logout",
        tags: ["Authentication"],
        responses: {
          200: { description: "Audited secure sign out complete" }
        }
      }
    },
    "/auth/users/{targetUid}/role": {
      put: {
        summary: "Update user role (Admin / Super Admin only)",
        tags: ["Admin"],
        parameters: [
          { name: "targetUid", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["role"],
                properties: {
                  role: { type: "string", enum: ["citizen", "collector", "admin", "super_admin"] },
                  status: { type: "string", enum: ["active", "disabled"] }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "Role synchronized successfully" }
        }
      }
    },
    "/users": {
      get: {
        summary: "List all users (Admin / Super Admin only)",
        tags: ["Users"],
        responses: {
          200: { description: "Array of profiles returned" }
        }
      }
    },
    "/users/{uid}/status": {
      put: {
        summary: "Set account status active/disabled",
        tags: ["Users"],
        parameters: [
          { name: "uid", in: "path", required: true, schema: { type: "string" } }
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status"],
                properties: { status: { type: "string", enum: ["active", "disabled"] } }
              }
            }
          }
        },
        responses: {
          200: { description: "Status changed successfully" }
        }
      }
    },
    "/reports": {
      get: {
        summary: "List all waste bin reports",
        tags: ["Reports"],
        responses: {
          200: { description: "Array of reports" }
        }
      },
      post: {
        summary: "Create a new waste bin report",
        tags: ["Reports"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["imageUrl", "latitude", "longitude", "address", "severity"],
                properties: {
                  imageUrl: { type: "string" },
                  latitude: { type: "number" },
                  longitude: { type: "number" },
                  address: { type: "string" },
                  severity: { type: "string", enum: ["full", "overflowing", "damaged", "illegal-dumping"] }
                }
              }
            }
          }
        },
        responses: {
          201: { description: "Reported successfully" }
        }
      }
    },
    "/reports/{id}": {
      get: {
        summary: "Get report details",
        tags: ["Reports"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Report details returned" } }
      },
      put: {
        summary: "Update report status or severity",
        tags: ["Reports"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  status: { type: "string", enum: ["reported", "acknowledged", "collected", "invalid"] },
                  severity: { type: "string", enum: ["full", "overflowing", "damaged", "illegal-dumping"] }
                }
              }
            }
          }
        },
        responses: { 200: { description: "Report updated" } }
      },
      delete: {
        summary: "Delete report (Admin/Super Admin only)",
        tags: ["Reports"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Deleted successfully" } }
      }
    },
    "/schedules": {
      get: {
        summary: "List all collection schedules",
        tags: ["Schedules"],
        responses: { 200: { description: "Array of schedules" } }
      },
      post: {
        summary: "Create a new collection schedule (Admin only)",
        tags: ["Schedules"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CollectionSchedule" }
            }
          }
        },
        responses: { 201: { description: "Schedule created" } }
      }
    },
    "/rewards": {
      get: {
        summary: "List all municipal reward listings",
        tags: ["Rewards"],
        responses: { 200: { description: "Array of rewards" } }
      }
    },
    "/rewards/{id}/redeem": {
      post: {
        summary: "Redeem a reward",
        tags: ["Rewards"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          201: { description: "Redeemed successfully, points deducted, voucher returned" },
          400: { description: "Insufficient points or out of stock" }
        }
      }
    },
    "/classify-waste": {
      post: {
        summary: "Classify waste using computer vision",
        tags: ["AI"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["imageUrl"],
                properties: { imageUrl: { type: "string" } }
              }
            }
          }
        },
        responses: {
          200: { description: "Classification result and explanation" }
        }
      }
    },
    "/chat": {
      post: {
        summary: "Converse with AI Eco Assistant",
        tags: ["Chat"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["message", "userId"],
                properties: {
                  message: { type: "string" },
                  userId: { type: "string" },
                  language: { type: "string", default: "en" }
                }
              }
            }
          }
        },
        responses: {
          200: { description: "AI reply text" }
        }
      }
    }
  }
};

// JSON Endpoint
router.get('/docs/json', (req: Request, res: Response) => {
  res.json(openApiSpec);
});

// UI Endpoint (Interactive CDN-based Swagger UI)
router.get('/docs', (req: Request, res: Response) => {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>EcoTrack Hyderabad API Documentation</title>
        <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
        <link rel="icon" type="image/png" href="https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=32&h=32" />
        <style>
          html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
          *, *:before, *:after { box-sizing: inherit; }
          body { margin: 0; background: #fafafa; font-family: sans-serif; }
          .header { background: #065f46; color: white; padding: 20px 40px; display: flex; align-items: center; justify-content: space-between; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
          .header p { margin: 5px 0 0 0; font-size: 13px; opacity: 0.8; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>EcoTrack Municipal Pilot API Hub</h1>
            <p>Admin, Collector, and Citizen unified REST services</p>
          </div>
          <a href="/docs/json" style="color: white; font-weight: 600; text-decoration: none; font-size: 13px; border: 1px solid rgba(255,255,255,0.4); padding: 8px 16px; rounded: 8px; border-radius: 6px; background: rgba(255,255,255,0.1);">View raw JSON Spec</a>
        </div>
        <div id="swagger-ui"></div>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js" charset="UTF-8"></script>
        <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js" charset="UTF-8"></script>
        <script>
          window.onload = () => {
            window.ui = SwaggerUIBundle({
              url: '/api/docs/json',
              dom_id: '#swagger-ui',
              deepLinking: true,
              presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
              ],
              layout: "BaseLayout"
            });
          };
        </script>
      </body>
    </html>
  `;
  res.send(html);
});

export default router;
