import express from 'express';
import { Message } from '../messages';

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

async function handleShow(res: express.Response): Promise<void> {
    res.json({
        role: 'assistant', content: `<iframe id="todo-app-iframe" src="http://localhost:8080/" width="600" height="400">
        </iframe>`, timestamp: now()
    });
}

async function handleHide(res: express.Response): Promise<void> {
    res.json({ role: 'assistant', content: 'Hiding content as requested.', timestamp: now() });
}

function now(): string {
    return new Date().toLocaleTimeString();
}
