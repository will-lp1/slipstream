import { generateUUID } from '@/lib/utils';

// For demo purposes, return a mock session with a valid UUID
export function createApiClient(request: Request) {
  return {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: {
              id: generateUUID(),
              email: 'demo@example.com'
            }
          }
        },
        error: null
      })
    }
  };
} 