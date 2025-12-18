/*
 *  Copyright 2025 Curity AB
 *
 *  Licensed under the Apache License, Version 2.0 (the "License");
 *  you may not use this file except in compliance with the License.
 *  You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an "AS IS" BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */

import {randomUUID} from 'crypto';
import {Session} from './session.js';

/**
 * Configuration options for session management
 */
export interface SessionConfig {
    /** Session timeout in milliseconds (default: 30 minutes) */
    sessionTimeoutMs?: number;
    /** Maximum number of concurrent sessions (default: 100) */
    maxSessions?: number;
    /** How often to run cleanup in milliseconds (default: 5 minutes) */
    cleanupIntervalMs?: number;
}

/**
 * Manages MCP server sessions, including creation, storage, and cleanup
 */
export class SessionManager {
    private sessions = new Map<string, Session>();
    private cleanupTimer?: NodeJS.Timeout;
    private config: Required<SessionConfig>;

    constructor(config: SessionConfig = {}) {
        this.config = {
            sessionTimeoutMs: config.sessionTimeoutMs ?? 30 * 60 * 1000, // 30 minutes
            maxSessions: config.maxSessions ?? 100,
            cleanupIntervalMs: config.cleanupIntervalMs ?? 5 * 60 * 1000, // 5 minutes
        };
    }

    /**
     * Generates a new session ID
     */
    private generateSessionId(): string {
        return randomUUID();
    }

    /**
     * Creates a new session
     */
    createSession(): Session {
        // Clean up old sessions if we're at the limit
        if (this.sessions.size >= this.config.maxSessions) {
            this.cleanupExpiredSessions();
        }

        let id = this.generateSessionId();

        if (process.env.DEVELOPER_MODE) {
            // ChatGPT seems to have some issue with keeping the MCP session.
            // This causes the frontend to initiate a new MCP session on every tool call.
            // Which, obviously, means that we're losing the session data between tool calls...
            // As a temporary fix, we're using just one session for the demo purposes.
            id = 'static_development_session';

            const existingSession = this.sessions.get(id);

            if (existingSession) {
                return existingSession;
            }
        }

        const session: Session = {
            id,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            client: null,
            stepupScope: undefined,
            highPrivilegeAccessToken: undefined,
            pollingUrl: '',
            pollingCount: 0,
            
        };

        this.sessions.set(id, session);
        return session;
    }

    getOrCreateSession(id: string | undefined): Session {
      if (id) {
          const session = this.getSession(id);
        if (session) {
          return session;
        }
      }
      const session = this.createSession();
      return session;
    }

    /**
     * Retrieves a session by ID
     */
    getSession(sessionId: string): Session | undefined {
        const session = this.sessions.get(sessionId);
        if (session) {
            // Update last accessed time
            session.lastAccessedAt = new Date();

            // Check if authorization has expired
            if (session.authorizationExpiry && session.authorizationExpiry < new Date()) {
                session.stepupScope = undefined;
                session.highPrivilegeAccessToken = undefined;
                session.authorizationExpiry = undefined;
            }
        }
        return session;
    }

    /**
     * Deletes a session
     */
    deleteSession(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    /**
     * Manually trigger cleanup of expired sessions
     */
    cleanupExpiredSessions(): number {
        const now = new Date();
        const expiredSessionIds: string[] = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            const timeSinceLastAccess = now.getTime() - session.lastAccessedAt.getTime();
            if (timeSinceLastAccess > this.config.sessionTimeoutMs) {
                expiredSessionIds.push(sessionId);
            }
        }

        // Remove expired sessions
        for (const sessionId of expiredSessionIds) {
            this.sessions.delete(sessionId);
        }

        return expiredSessionIds.length;
    }

    /**
     * Gracefully shuts down the session manager
     */
    shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.sessions.clear();
    }
}
