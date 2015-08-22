var express = require("express");

var port = process.env.PORT || 8080;
var app = express();
var server = app.listen(port, function() {
    console.log("Server running");
})

var Entities = require("html-entities").XmlEntities,
    entities = new Entities();
var io = require('socket.io').listen(server);
var redis = require("redis"),
    client = redis.createClient(15288,'pub-redis-16297.us-east-1-3.6.ex5.redislabs.com',{no_ready_check: true});
client.auth('mySecretPassword', function (err) {
    if (err) throw err;

});


app.use(express.static("public"));

client.on('connect', function() {
    console.log('connected');

    io.on('connection', function (socket) {
        socket.on("join", function (data) {
            if (data.length <= 25) {
                client.lpush("nicknames", entities.encode(data));
                socket.nickname =  entities.encode(data);
                client.lrange('nicknames', 0, -1, function (err, result) {
                    io.sockets.emit('online', result);



                });
            }


            client.lrange('messages', 0, -1, function (err, messages) {

                for (var i = messages.length - 1; i >= 0; i--) {
                    socket.emit('incomingMessage', messages[i]);
                }

            })

        })

        socket.on("message", function (data) {
            if (data.length <= 60 && socket.nickname && socket.nickname.length <= 20) {
                var message = socket.nickname + ": " + entities.encode(data)   ;
                client.lpush("messages", message);
                client.ltrim("messages", 0, 20);
                io.sockets.emit("incomingMessage", message);
            }

            });



        socket.on("disconnect", function () {


            client.lrem('nicknames', -1, socket.nickname);
            client.lrange('nicknames', 0, -1, function (err, result) {
                io.sockets.emit('online', result);

            });


        })


    })




});

app.get("/", function (req, res) {
    res.sendfile("public/views/index.html");
})