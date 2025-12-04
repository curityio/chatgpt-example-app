# Some (hopefully) helpful tips

- If you get some strange errors from chatGPT, like problems with loading the widget, or connecting to the MCP server, then delete the App and create a new one. Some things that get cached by chatGPT, and it is currently the only way to refresh. This is also needed when you want chatGPT to register a new client at the Curity Identity Server.

- Ngrok's dashboard can give a lot of helpful insights into the requests that are sent to the MCP server and Curity Identity Server. You can find it here: http://localhost:4040/inspect/http This can sometimes help understand what is going on.

- The widget prints out some stuff to the browser's console. You can check what happens with the widget's state using that.
