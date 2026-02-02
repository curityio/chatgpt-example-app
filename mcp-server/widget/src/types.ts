/*
 * Use the approach from: https://github.com/openai/openai-apps-sdk-examples
 */

export type OpenAiGlobals<
    ToolInput = UnknownObject,
    ToolOutput = CallToolResponseStructuredContent,
    ToolResponseMetadata = UnknownObject,
    WidgetState = CurityPortfolioWidgetState
> = {
    // visuals
    theme: Theme;

    userAgent: UserAgent;
    locale: string;

    // layout
    maxHeight: number;
    displayMode: DisplayMode;
    safeArea: SafeArea;

    // state
    toolInput: ToolInput;
    toolOutput: ToolOutput | null;
    toolResponseMetadata: ToolResponseMetadata | null;
    widgetState: WidgetState | null;
    setWidgetState: (state: WidgetState) => Promise<void>;
};

export type CurityPortfolioWidgetState = {
    portfolio?: Array<StockData>,
    updatedStock?: StockData,
    authMessage?: AuthMessage,
    error?: ToolError,
}

// currently copied from types.ts in chatgpt/web-sandbox.
// Will eventually use a public package.
type API = {
    callTool: CallTool;
    sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
    openExternal(payload: { href: string }): void;

    // Layout controls
    requestDisplayMode: RequestDisplayMode;
};

export type UnknownObject = Record<string, unknown>;

export type Theme = "light" | "dark";

export type SafeAreaInsets = {
    top: number;
    bottom: number;
    left: number;
    right: number;
};

export type SafeArea = {
    insets: SafeAreaInsets;
};

export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type UserAgent = {
    device: { type: DeviceType };
    capabilities: {
        hover: boolean;
        touch: boolean;
    };
};

/** Display mode */
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type RequestDisplayMode = (args: { mode: DisplayMode }) => Promise<{
    /**
     * The granted display mode. The host may reject the request.
     * For mobile, PiP is always coerced to fullscreen.
     */
    mode: DisplayMode;
}>;

export type ToolError = {
    status: number;
    code: string;
    message: string;
}

export type Tool = {
    toolName: string,
    parameters: {
        id: string,
        delta: number
    }
}

export type StockData = {
    id: string,
    name: string,
    currentPrice: number,
    quantity: number
}

export type AuthMessage = {
    message: string,
    qrCode: string,
}

export type CallToolResponse = {
    structuredContent: CallToolResponseStructuredContent,
};

export type CallToolResponseStructuredContent = {
    portfolio?: Array<StockData>;
    updatedStock?: StockData;
    authMessage?: AuthMessage;
    error?: ToolError;
    continueOperation?: Tool;
    continueAuthorization: boolean;
}

/** Calling APIs */
export type CallTool = (
    name: string,
    args: Record<string, unknown>
) => Promise<CallToolResponse>;

/** Extra events */
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";
export class SetGlobalsEvent extends CustomEvent<{
    globals: Partial<OpenAiGlobals>;
}> {
    readonly type = SET_GLOBALS_EVENT_TYPE;
}

/**
 * Global oai object injected by the web sandbox for communicating with chatgpt host page.
 */
declare global {
    interface Window {
        openai: API & OpenAiGlobals;
    }

    interface WindowEventMap {
        [SET_GLOBALS_EVENT_TYPE]: SetGlobalsEvent;
    }
}
