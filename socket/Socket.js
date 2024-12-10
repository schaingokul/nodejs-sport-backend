import { Server } from "socket.io";
import { createServer } from 'node:http';
import express from 'express'
import { fileURLToPath } from "node:url";
import {dirname, join}from 'node:path';


const app = express();
const server = createServer(app);
const io = new Server(server);
const __dirname = dirname(fileURLToPath(import.meta.url));



app.get('/', (req,res) => {
    res.sendFile(join(__dirname, 'index.html'))
})

io.on('connection', (socket) => {
    socket.on('chat message', (msg) => {
      io.emit('chat message', msg);
    });
  });



















/*
const io = new Server(server, {
    cors:{
        origin:["http://localhost:4500"],
        methods:["GET", "POST"],
    },
});

io.on("conncetion", (socket) => {
    console.log("a user connected ", socket.id);
    socket.emit("message", "Welcome")
    socket.on("disconnect", ()=> {
        console.log("User disconnect",socket.id);
    });
})*/

export {app,server}