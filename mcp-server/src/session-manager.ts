import { randomUUID } from 'crypto';

/**
 * Represents session-specific state and data
 */
export interface Session {
    id: string;
    createdAt: Date;
    lastAccessedAt: Date;
    token: string | undefined;
    authorizationExpiry?: Date;
}

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
        const id = this.generateSessionId();

        // Clean up old sessions if we're at the limit
        if (this.sessions.size >= this.config.maxSessions) {
            this.cleanupExpiredSessions();
        }

        const session: Session = {
            id,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            token: undefined,
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
                session.token = undefined;
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