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
import {ClaimsPrincipal} from '../oauth/claimsPrincipal.js';

/**
 * Configuration options for session management
 */
export interface SessionConfig {
    sessionTimeoutMs?: number;
    maxSessions?: number;
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

    /*
     * Called by MCP session handling to create a new session when no existing one is found
     */
    public createSession(claims?: ClaimsPrincipal): Session {

        //console.log('>>> Creating session, claims provided: ', claims);

        if (this.sessions.size >= this.config.maxSessions) {
            this.cleanupExpiredSessions();
        }

        // Only create a new session when the access token proves a new session is needed
        const existingSession = this.getSessionFromAccessToken(claims);
        if (existingSession) {
            return existingSession;
        }

        // Create the session data with initial state
        const id = randomUUID();
        const session: Session = {
            id,
            createdAt: new Date(),
            lastAccessedAt: new Date(),
            delegationId: claims?.delegationId,
            dpopKeyPair: undefined,
            haapiAccessToken: undefined,
            haapiTokenType: undefined,
            haapiExpiresAt: undefined,
            haapiSessionId: undefined,
            pollingData: null,
            pollingCount: 0,
            highPrivilegeAccessToken: undefined,
        };

        this.sessions.set(id, session);
        return session;
    }

    /*
     * Called by tools
     */
    public getOrCreateSession(id: string | undefined, claims?: ClaimsPrincipal): Session {

        if (id) {
            const session = this.getSession(id);
            if (session) {
                return session;
            }
        }

        return this.createSession(claims);
    }

    /*
     * Retrieves a session by ID and handles session expiry
     */
    public getSession(sessionId: string, claims?: ClaimsPrincipal): Session | undefined {

        let session = this.sessions.get(sessionId);
        if(!session) {
            session = this.getSessionFromAccessToken(claims);
        }

        if (session) {
            session.lastAccessedAt = new Date();
        }

        return session;
    }

    /*
     * Maintains the MCP session but clears state used for step up authentication
     */
    public clearStepupAuthenticationState(session: Session) {
        
        session.dpopKeyPair = undefined;
        session.haapiAccessToken = undefined;
        session.haapiTokenType = undefined;
        session.haapiExpiresAt = undefined;
        session.haapiSessionId = undefined;
        session.pollingData = null;
        session.pollingCount = 0;
        session.highPrivilegeAccessToken = undefined;
    }

    /*
     * Deletes a session
     */
    public deleteSession(sessionId: string): boolean {
        return this.sessions.delete(sessionId);
    }

    /**
     * Gracefully shuts down the session manager
     */
    public shutdown(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = undefined;
        }
        this.sessions.clear();
    }

    /*
     * Manually trigger cleanup of expired sessions
     */
    private cleanupExpiredSessions(): number {
        const now = new Date();
        const expiredSessionIds: string[] = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            const timeSinceLastAccess = now.getTime() - session.lastAccessedAt.getTime();
            if (timeSinceLastAccess > this.config.sessionTimeoutMs) {
                expiredSessionIds.push(sessionId);
            }
        }

        for (const sessionId of expiredSessionIds) {
            this.sessions.delete(sessionId);
        }

        return expiredSessionIds.length;
    }

    /*
     * At the time of writing, ChatGPT developer mode creates a new session on each tool request
     * The MCP client's OAuth session is represented by the access token's delegation ID
     * Therefore, use the delegation ID as a stable session identifier
     */
    private getSessionFromAccessToken(claims?: ClaimsPrincipal): Session | undefined {

        let sessionFromAccessToken: Session | undefined = undefined;

        if (claims?.delegationId) {

            this.sessions.forEach((s) => {
                if (s.delegationId === claims.delegationId) {
                    sessionFromAccessToken = s;
                }
            });
        }

        return sessionFromAccessToken;
    }
}
