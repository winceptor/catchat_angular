//
// # SimpleServer
//
// A simple chat server using Socket.IO, Express, and Async.
//
var http = require('http');
var path = require('path');

var fs = require('fs');
var path = require('path')

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

//
// ## SimpleServer `SimpleServer(obj)`
//
// Creates a new instance of SimpleServer with the following options:
//  * `port` - The HTTP port to listen on. If `process.env.PORT` is set, _it overrides this value_.
//
var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
io.set('log level',0);

router.use(express.static(path.resolve(__dirname, 'client')));
var messages = {};
var users = {};
var sockets = [];

var nextuserid0 = 0;
function nextuserid() {
  nextuserid0++;
  return "u" + nextuserid0;
}


var nextmessageid0 = 0;
function nextmessageid() {
  nextmessageid0++;
  return "m" +nextmessageid0;
}

function generateuserhash() {
  return Math.random().toString(36).substring(3,16) + +new Date;
}

var sharedtext = {};
sharedtext.text = "";
sharedtext.caret = 0;
sharedtext.change = 0;

var maxtextlength = 3000;

io.on('connection', function (socket) {
    /*socket.userid = socket.userid || nextuserid();
    socket.set('userid', socket.userid, function (err) {
      if (err) {console.log(err); return false;}
      socket.emit('userid', socket.userid);
    });*/
     
    sockets.push(socket);
    
    /*  
    messages.forEach(function (data) {
      socket.emit('message', data);
    });
    */
    
    
    socket.on('loadmessages', function (lastmsg) {
      for (var key in messages) {
        // skip loop if the property is from prototype
        if (!messages.hasOwnProperty(key)) continue;
    
        var msg = messages[key];
        /*
        for (var prop in msg) {
            // skip loop if the property is from prototype
            if(!msg.hasOwnProperty(prop)) continue;
            
            var data = msg[prop];
            
        }*/
        if (msg!=undefined)
        {
          socket.emit('message', msg);
        }
      }
    });

    
    
    //broadcast('textchange', sharedtext);

    socket.on('disconnect', function () {
      sockets.splice(sockets.indexOf(socket), 1);
      updateRoster();
    });

    socket.on('message', function (msg) {
      var messagetext = String(msg || '');

      if (!messagetext)
        return;
        
      if (messagetext.length>maxtextlength)
      {
        messagetext = messagetext.slice(0, 3000);
      }

      socket.get('userdata', function (err, userdata) {
        if (err || !userdata) {console.log(err); return false;}
        var messageid = nextmessageid();
        var msgdata = {
          user: userdata,
          text: messagetext,
          messageid: messageid
        };

        broadcast('message', msgdata);
        messages[messageid] = msgdata;
      });
    });
    
    socket.on('updatemessage', function (newmsg) {
      var messageid = newmsg.messageid;
      var messagetext = newmsg.text;
      
      if (messagetext.length>maxtextlength)
      {
        messagetext = messagetext.slice(0, 3000);
      }
      
      var oldmsg = messages[messageid];
      var userdata = oldmsg.user;

      if (!oldmsg || userdata.userid!=newmsg.user.userid || userdata.userid!=socket.userid)
        return;

      var msgdata = {
          user: userdata,
          text: messagetext,
          messageid: messageid
        };
      
      if (!newmsg.text || newmsg.text=="")
      {
        broadcast('updatedmessage', msgdata);
        messages[messageid] = undefined;
      }
      else
      {
        broadcast('updatedmessage', msgdata);
        messages[messageid] = msgdata;
          
      }
    });
    
    socket.on('removemessage', function (remmsg) {
      var messageid = remmsg.messageid;
      var oldmsg = messages[messageid];
      var userdata = oldmsg.user;

      if (!oldmsg || userdata.userid!=newmsg.user.userid || userdata.userid!=socket.userid)
        return;

       var msgdata = {
          user: userdata,
          text: "",
          messageid: messageid
        };

      broadcast('removedmessage', msgdata);
      messages[messageid] = undefined;
    });
    /*
    socket.on('changetext', function (data){
      var text = data.text || '';
      var caret = data.caret || 0;
      var text = String(text || '');

      if (!text)
        return;

        //sharedtext = text;
        var change = text.length - sharedtext.text.length;
       
        
        
        sharedtext.text = text;
        sharedtext.caret = caret;
        sharedtext.change = change;

        broadcastothers('textchange', sharedtext, socket);
 
    });
    
    socket.on('charinput', function (data){
      var char = data.char || '';
      var caret = data.caret || sharedtext.text.length-1;
      //var text = String(text || '');

      if (!char || char==''){
         return;
      }       

        //sharedtext = text;
        //var change = text.length - sharedtext.text.length;
       
        var text = sharedtext.text;
        sharedtext.text = text.slice(0, caret) + char + text.slice(caret);
        //sharedtext.text = text;
        //sharedtext.caret = caret;
        //sharedtext.change = change;
        
         var data = {
          char: char,
          caret: caret
        };

        broadcast('char', data, socket);
 
    });
    */
    
    socket.on('identify', function (userdata) {
      var name = userdata.username || "";
      if (name.length>30){
        name = 'Anonymous';
      }
      //
      if (userdata && userdata.userid && userdata.userhash && users[userdata.userid] && users[userdata.userid].userhash==userdata.userhash)
      {
        userdata.username = name;
        
        socket.userid = userdata.userid;
        users[socket.userid] = userdata;
        console.log("old:" + JSON.stringify(userdata));
      }
      else
      {
        var newuserdata = {};
        newuserdata.userid = nextuserid();
        newuserdata.userhash = generateuserhash();
        newuserdata.username = name;
        
        socket.userid = newuserdata.userid;
        users[socket.userid] = newuserdata;
        
        userdata = newuserdata;
        console.log("new:" + JSON.stringify(userdata));
      }
      //
      
      var user = {};
      user.userid = socket.userid;
      user.username = String(name || '');
      socket.set('userdata',user , function (err) {
        if (err) {console.log(err); return false;}
        
        socket.emit('identified', userdata);
        updateRoster();
        
        var nowtime = Date.now();
        socket.emit('heartbeat', nowtime);
      });
    });
    
    socket.on('mousemove', function (cursor) {
      cursor.userid = socket.userid;
      socket.set('cursor', cursor, function (err) {
        if (err) {console.log(err); return false;}
        ratelimiter(function (){
          broadcastothers('cursormove', cursor, socket);
        });
      });
    });
    
    socket.on('caretmove', function (caret) {
      socket.set('caret', caret, function (err) {
        if (err) {console.log(err); return false;}
        updateCarets();
      });
    });
    
    var beatrate = 1000;
    socket.on('heartbeat', function (time) {
      var nowtime = Date.now();
      var diff = nowtime-time;
      //console.log("socket: " + socket.userid + " ping: " + diff);
      socket.heartbeat = setTimeout(function(){ 
        var nowtime = Date.now();
        socket.emit('heartbeat', nowtime); 
        
      }, beatrate);
      
    });
  });

function updateRoster() {
  
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('userdata', callback);
    },
    function (err, names) {
      if (err) {console.log(err); return false;}
      broadcast('roster', names);
    }
  );
}


var cursorupdatetimer = false;
function updateCursors() {
  if (cursorupdatetimer) {
    return;
  }
  else
  {
    cursorupdatetimer = setTimeout(function(){ cursorupdatetimer = false; }, 1000/120);
  }
  
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('cursor', callback);
    },
    function (err, cursors) {
        if (err) {console.log(err); return false;}
      broadcast('cursors', cursors);
    }
  );
}



var caretupdatetimer = false;
function updateCarets() {
  if (caretupdatetimer) {
    return;
  }
  else
  {
    caretupdatetimer = setTimeout(function(){ caretupdatetimer = false; }, 1000/120);
  }
  
  async.map(
    sockets,
    function (socket, callback) {
      socket.get('caret', callback);
    },
    function (err, carets) {
        if (err) {console.log(err); return false;}
      broadcast('carets', carets);
    }
  );
}

function broadcast(event, data) {
  sockets.forEach(function (socket) {
    socket.emit(event, data);
  });
}

function broadcastothers(event, data, ignored) {
  sockets.forEach(function (socket) {
    if (ignored!=socket) {
      socket.emit(event, data);
    }
  });
}

var limitratetimer = false;
var limitrate = 10;
function ratelimiter(callback) {
  if (limitratetimer) {
    return false;
  }
  else
  {
    limitratetimer = setTimeout(function(){ limitratetimer = false; }, 1000/limitrate);
  }
  
  return callback();
}

var dataDirectory = path.join("./", 'data');
var messagesFile = path.join(dataDirectory, 'messages.js');
var usersFile = path.join(dataDirectory, 'users.js');


// ensure data directory exists
fs.existsSync(dataDirectory) || fs.mkdirSync(dataDirectory)

function autoload(){
  //console.log("autoloading..." + messagesFile + "..." + usersFile);
  if (fs.existsSync(messagesFile))
  {
    var jsondata = fs.readFileSync(messagesFile, 'utf8', function(err, data){
			if (err) {
				console.log(err);
			}
		});
		var data = JSON.parse(jsondata);
		messages = data.messages || {};
		nextmessageid0 = data.nextmessageid0 || 0;
  }
  if (fs.existsSync(usersFile))
  {
    var jsondata = fs.readFileSync(usersFile, 'utf8', function(err, data){
			if (err) {
				console.log(err);
			}
		});
		var data = JSON.parse(jsondata);
		users = data.users || {};
		nextuserid0 = data.nextuserid0 || 0;
  }
}
autoload();

var autosaveint = 30;
function autosave(){
  //console.log("autosaving..." + messagesFile + "..." + usersFile);
  var messagesdata = JSON.stringify(messages);
  var data = {"nextmessageid0": nextmessageid0, "messages": messages};
	var jsondata = JSON.stringify(data);
  fs.writeFileSync(messagesFile, jsondata, 'utf8', function(err, data){
		if (err) {
			console.log(err);
		}
	});
	var data = {"nextuserid0": nextuserid0, "users": users};
	var jsondata = JSON.stringify(data);
	fs.writeFileSync(usersFile, jsondata, 'utf8', function(err, data){
		if (err) {
			console.log(err);
		}
	});
  
  //loop
  setTimeout(autosave, 1000*autosaveint);
}
autosave();

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
