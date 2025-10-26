import express from 'express';
import { Message } from '../messages';
import mcpServerConfig from '../../config.json' assert { type: 'json' };

export async function handleMessage(message: Message, res: express.Response): Promise<void> {
    switch (message.content.toLowerCase()) {
        case 'show':
            await handleShow(res);
            break;
        case 'hide':
            await handleHide(res);
            break;
        default:
            const reply: Message = {
                role: 'assistant',
                content: `ECHO: ${message.content}`,
                timestamp: now()
            };
            res.json(reply);
    }
}

/// When the user asks to show the todo app, respond with an iframe embedding it.
async function handleShow(res: express.Response): Promise<void> {
    res.json({
        role: 'assistant', content: `<iframe id="todo-app-iframe" src="${mcpServerConfig.mcpServerUrl}" width="550" height="400">
        </iframe>`, timestamp: now()
    });
}

/// The client handles hiding the iframe, so just confirm the action here.
async function handleHide(res: express.Response): Promise<void> {
    res.json({ role: 'assistant', content: 'Todo App hidden as requested.', timestamp: now() });
}

function now(): string {
    return new Date().toLocaleTimeString();
}
