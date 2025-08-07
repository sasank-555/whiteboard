import { WebSocketServer, WebSocket } from "ws";
const wss = new WebSocketServer({ port: 8080 });
let clients = [];
wss.on("connection", (socket) => {
    console.log("New client connected");
    clients.push(socket);
    socket.on("message", (message) => {
        clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                // console.log(message.toString());
                client.send(message.toString());
            }
        });
    });
    socket.on("close", () => {
        console.log("Client disconnected");
        clients = clients.filter((client) => client !== socket);
    });
});
console.log("WebSocket server running on ws://localhost:8080");
