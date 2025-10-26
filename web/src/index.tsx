import React from 'react';
import ReactDOM from 'react-dom/client';
import { TodoApp } from './todo';

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TodoApp />);