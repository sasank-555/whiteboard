import { WebSocketServer, WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8080 });

let clients: WebSocket[] = [];
let roomToPerson = new Map<string, WebSocket[]>();
wss.on("connection", (socket: WebSocket) => {
  console.log("New client connected");
  clients.push(socket);

  socket.on("message", (message: Buffer | string) => {
    const data = JSON.parse(message.toString());
    if (data.back_type === "join") {
      const room_id = data.room;
      roomToPerson.get(room_id)?.push(socket);
    }
    if (data.back_type === "leave") {
      const room_id = data.room;
      const currentClients = roomToPerson.get(room_id) || [];
      roomToPerson.set(
        room_id,
        currentClients.filter((client) => client !== socket)
      );
    }
    if (data.back_type === "send_message") {
      const room_id = data.room;
      const currentClients = roomToPerson.get(room_id) || [];
      currentClients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message.toString());
        }
      });
    }
  });

  socket.on("close", () => {
    console.log("Client disconnected");
    clients = clients.filter((client) => client !== socket);
  });
});
