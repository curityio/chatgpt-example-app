import React from 'react';
import ReactDOM from 'react-dom/client';
import { TodoApp } from './todo';

// Check if we should use the test controller
// This can be set via build-time define flag
const useTestController = typeof __TEST_CONTROLLER__ !== 'undefined' ? __TEST_CONTROLLER__ : false;

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<TodoApp useTestController={useTestController} />);
