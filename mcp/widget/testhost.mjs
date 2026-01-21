import express from 'express';

const app = express();
app.use('/', express.static('../mcp-server/dist/web'));

const port = 3000;
app.listen(port, () => {
    console.log(`Test widget host is listening on HTTPS port ${port}`);
});
