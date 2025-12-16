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

import {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import {Authorizer} from './authorizer.js';
import {Session} from './sessionManager.js';

/*
 * Return a step up response to the MCP client
 */
export async function requestAuthorization(authorizer: Authorizer, receivedAccessToken: string, session: Session): Promise<CallToolResult> {
    
    const checkMark = 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAAAAXNSR0IArs4c6QAABSlJREFUeF7tnUty1DAQhqUjhAtAFVeAXaqS2bDLFeAYsCIZVnAMuEJ2bDKpyo5cIVVwAXIEQzvWPGKPH1Kr3W39sxkSj1vt//ske5wh8a7nUVXVebP5snkOX/fthm3zJ7Bxzt1SG977q752fNfGBjxBB/D5YXJ0sD4mQkuABv4Nx6iooS6BlggHAlRVRctFWO7VdY+GWBI4kGArAOCzhGulyMp7T9cJbl+Aykr36JMlgVqCWgDMfpZArRXZeO9XQQDMfmv4ePpdecx+niSNVoEARsFxtb2hFYDe8+OGD1ekturUAuD8bwsaa7cQgDVOe8UggD1mrB1DANY47RWDAPaYsXYMAVjjtFcMAthjxtoxBGCN014xCGCPGWvHEIA1TnvFIIA9ZqwdQwDWOO0VgwD2mLF2DAFY47RXDALYY8baMQRgjdNeMQhgjxlrxxCANU57xSCAPWasHUMA1jjtFYMA9pixdgwBWOO0VwwC2GPG2jEEYI1zWrG7xz/u20P9izzc3d/f7tPrs/rfH5vnadXiXg0B4nJL3ovAf23gPy9GIkhJAAGSUU4vcHH/o57xfQ8pCSDAdH5Je4yBHwa4fvvBnZ68TBpvaGcIMJQQ4/Yp8GnY0xev3PWb94wdtEtBgKzx7opPhQ8BhMBIDBMDP/T1+O5z1haxAmSN17kU+BIXghAgowAp8KktCJARTu7SFuBTBlgBMpiQCl/i6j8cNgRgFsASfKwAhcOHAIwCWJv5OAUAfp0ArgESRbA687ECJIKn3a3DxwqQIMES4EOASAGWAh8CRAiwJPgQYKIAS4MPASYIsET4EGCkAEuFDwFGCLBk+OICaPgc/Ajm25csHb6oAFo+Bz9WgBLgiwnQBz8AkfwZ+JAEpcAXEWAMfE0SlARfnQDU0JwrQWnwRQQ4+fllaMVtbZ9DghLhiwgQG6ykBLE9ajp1TZ5lzQ7ZPw+QEq6EBCn9zX3KioW+v192Aei9/8Wv79G95pSgdPgipwAaZMo7gS5TckgA+E9JZ18BAlBNgWvqJXppZNpRTADqV0PwGnpgYsdSRlSAuSUA/LYz4gLMJQHgdy8YswggLQHgHz9bzCaAlASA33+pMKsAuSUA/OHrxNkFyCUB4A/DF70PMNQOJzDOWkN9W9+uYgXgvFlEtYZ+CWMftBx3HTVLokoAjtNBStilwVd1CtgHl7qEx0hQIny1AkivBKXCVy2AlAQlw1cvQG4JSodvQoBcEgD+05WSuncBxy7gOC8MAX+XshkBuFYCwD+cYqYESJUA8NvrqzkBYiUA/O6Tq0kBpkoA+MdvjZkVYKwEgN9/X9S0AHRofR85B/zhm+LmBQgS0DP9J5TwoL+7l/svbg3Hq/8VixBAf8x6O4QAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQCKCXjUhnEEAkZr2DQAC9bEQ6gwAiMesdBALoZSPSGQQQiVnvIBBALxuRziCASMx6B4EAetmIdAYBRGLWOwgE0MtGpDMIIBKz3kEggF42Ip1BAJGY9Q4CAfSyEekMAojErHcQEuDGOXeut0V0ljGBDQTImK6B0msSgGY/rQJ4lJcABCiP+e6IPT3oS1wHFKnB+j/+qyAATgOFORAmfy1AswpAgnIkqGc/He5WgEYC+uZlOTkUeaRb+C0BIMHihVh57zf7R3mwAuxvqKoKq8FyfCDoNPMP4HeuAM+PuRGBvn2GO4ZmjAig1zXkDvDhSP4BcLDmrm+X+ucAAAAASUVORK5CYII=';
    const output = await authorizer.authorizeWithBankID(receivedAccessToken, session);
    if (output.success) {
        const structuredContent = {
            authMessage: {
                message: output.message,
                qrCode: output.qrCode
            }
        };
        return {
            // The structuredContent should be exactly the same as the unstructured content
            // according to https://modelcontextprotocol.io/specification/2025-06-18/server/tools#structured-content
            // We do not include the image in the output the LLM will see, to avoid bloating the LLM context.
            content: [
                { type: 'text', annotations: { audience: ['user'] }, text: JSON.stringify(structuredContent) } as any,
                { type: 'image', data: output.qrCode || checkMark, mimeType: 'image/png', annotations: { audience: ['user']} } as any,
                { type: 'text', annotations: { audience: ['assistant'] }, text: 'Show the user the response from this tool and ask them to confirm when they approved authorization. Once the user approves, run the initial tool again.'} as any
            ],
            structuredContent,
        };
    }
    const structuredContent = { success: false, authMessage: { message: output.message, qrCode: null }};
    return {
        content: [{ type: 'text', text: JSON.stringify(structuredContent) }],
        structuredContent,
    };
}
