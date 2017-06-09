//angular part



  function getCaretPosition(ctrl)
  {
   var CaretPos = 0;

   if (ctrl.selectionStart || ctrl.selectionStart == 0)
   {// Standard.
    CaretPos = ctrl.selectionStart;
   }
   else if (document.selection)
   {// Legacy IE
    ctrl.focus ();
    var Sel = document.selection.createRange ();
    Sel.moveStart ('character', -ctrl.value.length);
    CaretPos = Sel.text.length;
   }
  
   return (CaretPos);
  }
  
  
  function setCaretPosition(ctrl,pos)
  {
   if (ctrl.setSelectionRange)
   {
    ctrl.focus();
    ctrl.setSelectionRange(pos,pos);
   }
   else if (ctrl.createTextRange)
   {
    var range = ctrl.createTextRange();
    range.collapse(true);
    range.moveEnd('character', pos);
    range.moveStart('character', pos);
    range.select();
   }
  }
  
  /*
  function getCaretCharacterOffsetWithin(element) {
    var caretOffset = 0;
    var doc = element.ownerDocument || element.document;
    var win = doc.defaultView || doc.parentWindow;
    var sel;
    if (typeof win.getSelection != "undefined") {
        sel = win.getSelection();
        if (sel.rangeCount > 0) {
            var range = win.getSelection().getRangeAt(0);
            var preCaretRange = range.cloneRange();
            preCaretRange.selectNodeContents(element);
            preCaretRange.setEnd(range.endContainer, range.endOffset);
            caretOffset = preCaretRange.toString().length;
        }
    } else if ( (sel = doc.selection) && sel.type != "Control") {
        var textRange = sel.createRange();
        var preCaretTextRange = doc.body.createTextRange();
        preCaretTextRange.moveToElementText(element);
        preCaretTextRange.setEndPoint("EndToEnd", textRange);
        caretOffset = preCaretTextRange.text.length;
    }
    return caretOffset;
  }
  
  
  // Move caret to a specific point in a DOM element
  function SetCaretPosition(el, pos){
  
      // Loop through all child nodes
      for(var node of el.childNodes){
          if(node.nodeType == 3){ // we have a text node
              if(node.length >= pos){
                  // finally add our range
                  var range = document.createRange(),
                      sel = window.getSelection();
                  range.setStart(node,pos);
                  range.collapse(true);
                  sel.removeAllRanges();
                  sel.addRange(range);
                  return -1; // we are done
              }else{
                  pos -= node.length;
              }
          }else{
              pos = SetCaretPosition(node,pos);
              if(pos == -1){
                  return -1; // no need to finish the for loop
              }
          }
      }
      return pos; // needed because of recursion stuff
  }
  
  var savedRange,isInFocus;
  function saveSelection()
  {
      if(window.getSelection)//non IE Browsers
      {
          savedRange = window.getSelection().getRangeAt(0);
      }
      else if(document.selection)//IE
      { 
          savedRange = document.selection.createRange();  
      } 
  }
  
  function restoreSelection()
  {
      isInFocus = true;
      //document.getElementById("area").focus();
      if (savedRange != null) {
          if (window.getSelection)//non IE and there is already a selection
          {
              var s = window.getSelection();
              if (s.rangeCount > 0) 
                  s.removeAllRanges();
              s.addRange(savedRange);
          }
          else if (document.createRange)//non IE and no selection
          {
              window.getSelection().addRange(savedRange);
          }
          else if (document.selection)//IE
          {
              savedRange.select();
          }
      }
  }*/
    
  function resize () {
      text.style.height = 'auto';
      text.style.height = text.scrollHeight+'px';
  }
  /* 0-timeout to get the already changed text */
  function delayedResize () {
      window.setTimeout(resize, 0);
  }
  
  var app = angular.module('app', []);
  
  // html filter (render text as html)
  app.filter('html', ['$sce', function ($sce) { 
      return function (text) {
          return $sce.trustAsHtml(text);
      };    
  }])
  
  app.directive('focusMe', function($timeout, $parse) {
    return {
      //scope: true,   // optionally create a child scope
      link: function(scope, element, attrs) {
        var model = $parse(attrs.focusMe);
        scope.$watch(model, function(value) {
          if(value === true) { 
            $timeout(function() {
              element[0].focus(); 
            });
          }
        });
        // on blur event:
        element.bind('blur', function() {
           scope.$apply(model.assign(scope, false));
        });
      }
    };
  });

  app.controller('ChatController', function($scope) {
        //var $scope = this;
      //function ChatController($scope) {
        var socket = io.connect();
        
        var textinputdiv = document.getElementById("textinput");
        var textoutputdiv = document.getElementById("textoutput");
        $scope.maxtextlength = 3000;
        
        
        $scope.disableinput = false;
        $scope.mainfocus = false;
        $scope.caret = {"pos":-1, "name":""};

        $scope.messages = {};
        $scope.msgs = [];
        $scope.roster = {};
        
        $scope.mousedata = {};
        $scope.cursors = {};
        $scope.cursor = {};
        
        $scope.userid = localStorage.getItem('userid');
        $scope.userhash = localStorage.getItem('userhash');
        $scope.username = localStorage.getItem('username') || '';
        $scope.text = '';
        
        $scope.textinput = "";
        $scope.textoutput = "";

        $scope.textcareted = "";
        
        $scope.lastmessage = false;
        
        $scope.notifications = true;
        
        var notifications = localStorage.getItem('notifications');
        //console.log(notifications);
        if (notifications && notifications=="false") {
          $scope.notifications = false;
        }
        
        
        
        
        $scope.identified = false;
        
        socket.on('connect', function () {
          //$scope.setName();
          //getfocus();
          $scope.identify();
          
          $scope.mainfocus = true;
          
          socket.emit('loadmessages', false);
          
        });
        
        socket.on('identified', function (userdata) {
          socket.userid = userdata.userid;
          
          $scope.userid = userdata.userid;
          $scope.userhash = userdata.userhash;
          //$scope.username = userdata.username;
          
          
          localStorage.setItem('userid', $scope.userid);
          localStorage.setItem('userhash', $scope.userhash);
          localStorage.setItem('username', $scope.username);
          
          $scope.identified = true;
          
          
        });
        
        $scope.timeouttimer = false;
        $scope.info = "Connecting to server...";
        $scope.loading = true;
        
        $scope.timeout = 3;
        socket.on('heartbeat', function (time) {
          $scope.$apply();
          socket.emit('heartbeat', time);
          
          $scope.loading = false;
          //$scope.loading = false;
          if ($scope.timeouttimer)
          {
            clearTimeout($scope.timeouttimer);
          }
          $scope.timeouttimer = setTimeout(function(){ 
            $scope.loading = true; 
            $scope.info = "Disconnected. Trying to reconnect...";
            
          }, 1000*$scope.timeout);
          //$scope.lastheartbeat = time;
          
        });

        socket.on('message', function (msg) {
          if (!msg.user) {
            return
          }
          msg.unparsed = msg.text;
          
          msg.parsed = parsemessage(msg.unparsed);
          //msg.text = parsed;
          
          //console.log(msg);
          
          //$scope.messages.unshift(msg);
          
          msg.editable = msg.user.userid==$scope.userid;
          
          $scope.messages[msg.messageid] = msg;
          
          //$scope.messagearray = $scope.outputmessages();

          
          notify(msg, $scope.notifications);
          
          //notify(msg.user.username, msg.parsed);
          
          //notify
      		
          
          $scope.$apply();
          
          $scope.loading = false;
          
        });
        
        socket.on('updatedmessage', function (msg) {

          
          if (!msg.text || msg.text=="") {
            //$scope.messages[msg.messageid] = undefined;
            delete $scope.messages[msg.messageid];
          }
          else
          {
            msg.unparsed = msg.text;
            
            msg.parsed = parsemessage(msg.unparsed);
            //msg.text = parsed;
            
            //console.log(msg);
            
            //$scope.messages.unshift(msg);
            
            msg.editable = msg.user.userid==$scope.userid;
            
            $scope.messages[msg.messageid] = msg;
            
            
            
          }
          $scope.$apply();
        });
        
        /*
        socket.on('textchange', function (data) {
          console.log("text reloaded");
          var text = data.text;
          //var caret = data.caret;
          
          
          
          //var caretpos = getCaretCharacterOffsetWithin(textoutputdiv);
          
          //saveSelection();
          
          //var unparsed = msg.text;
          //var parsed = parsemessage(unparsed);
          //msg.text = parsed;
          $scope.textinput = text;
          
          $scope.$apply();
          

          $scope.render();
          
          
          $scope.$apply();
          
          //if (caret<=caretpos) {
            //caretpos+= data.change;
          //}
          //SetCaretPosition(textoutputdiv, caretpos);
          
          //restoreSelection();
          
          $scope.disableinput = false;
          
          textinputdiv.style.height = 'auto';
          textinputdiv.style.height = textinputdiv.scrollHeight+'px';
        });
        */
        /*
        socket.on('char', function (data) {
          console.log("r:" + data.char);
          var char = data.char;
          var caret = data.caret;
          
          var caretpos = doGetCaretPosition(textoutputdiv);
          
          var text = $scope.textinput;
          $scope.textinput = text.slice(0, caret) + char + text.slice(caret);
          
          //var unparsed = msg.text;
          //var parsed = parsemessage(unparsed);
          //msg.text = parsed;
          $scope.textoutput = parsemessage($scope.textinput);
          $scope.$apply();
          
          if (caretpos>=caret) {
            caretpos++;
          }
          setCaretPosition(textoutputdiv, caretpos);
          
          $scope.disableinput = false;
          
          
          
          textinputdiv.style.height = 'auto';
          textinputdiv.style.height = textinputdiv.scrollHeight+'px';
        });
        */

        socket.on('roster', function (users) {
          $scope.roster = users;
          $scope.$apply();
        });
        
        /*
        socket.on('cursors', function (cursors) {
          //$scope.cursors = cursors;
          $scope.$apply();
        });
        */
        
        var cursortimeout = 3; //seconds
        socket.on('cursormove', function (cursor) {
          if ($scope.cursors[cursor.userid] && $scope.cursors[cursor.userid].removetimerid)
          {
            clearTimeout($scope.cursors[cursor.userid].removetimerid);
          }
          
          $scope.cursors[cursor.userid] = cursor;
          $scope.cursors[cursor.userid].opacity = 1;
          
          $scope.cursors[cursor.userid].removetimerid = setTimeout(function(){ $scope.cursors[cursor.userid].opacity = 0; }, 1000*cursortimeout);
          $scope.$apply();
        });
        
        socket.on('carets', function (carets) {
          $scope.carets = carets;
          $scope.$apply();
        });
        
        $scope.outputmessages = function outputmessages() {
          //console.log('Sending message:', $scope.text);
          var obj = $scope.messages;
          $scope.messagearray = Object.keys(obj).map(function (key) { 
            if (obj[key] && obj[key].user && obj[key].user.userid && obj[key].user.userid==$scope.userid)
            {
              $scope.lastmessage = obj[key];
            }
            return obj[key]; 
            
          });
          return $scope.messagearray;
        };
        
        /*$scope.outputcursors = function outputcursors() {
          //console.log('Sending message:', $scope.text);
          var obj = $scope.cursors;
          $scope.cursorarray = Object.keys(obj).map(function (key) { 
            if ($scope)
            return obj[key]; 
            
          });
          $scope.cursorarray = [];
          for (var user in $scope.users){
            
          }
          return $scope.cursorarray;
        };*/

        $scope.send = function send() {
          //console.log('Sending message:', $scope.text);
          if ($scope.text=="" && $scope.lastmessage)
          {
            $scope.startedit($scope.lastmessage);
          }
          else
          {
            socket.emit('message', $scope.text);
            $scope.text = '';
            $scope.info = "Sending message...";
            $scope.loading = true;
          }
          
        };
        
        $scope.update = function update(msg) {
          if (msg.user.userid!=$scope.userid){
            return false;
          }
          
          //var text = msg.text;
          socket.emit('updatemessage', msg);
          $scope.stopedit(msg);
          $scope.info = "Updating message...";
          $scope.loading = true;
        };
        
           
        $scope.startedit = function startedit(msg) {
          //console.log("msg.userid: " + msg.user.userid);
          //console.log("$scope.userid: " + $scope.userid);
          if (msg.user.userid!=$scope.userid){
            return false;
          }
          $scope.mainfocus = false;
          msg.editing = true;
          msg.focus = true;
        };
        
        $scope.stopedit = function stopedit(msg) {
          msg.editing = false;
          $scope.mainfocus = true;
        };
        
        $scope.setnotifications = function setnotifications() {
          //console.log($scope.notifications);
          localStorage.setItem('notifications', $scope.notifications);
        };
        
        $scope.setName = function setName() {
          //socket.emit('setname', $scope.name);
          
          //localStorage.setItem('name', $scope.name);
          //$scope.identified = false;
          $scope.identify();
        };
        
        $scope.identify = function identify() {
          var userdata = {};
          userdata.userhash = $scope.userhash;
          userdata.userid = $scope.userid;
          userdata.username = $scope.username;
          
          //console.log(userdata);
          socket.emit('identify', userdata);
        };
        
        /*
        $scope.changeText = function changeText() {
          console.log("changed text");
          
          var caret = getCaretPosition(textinputdiv);
          
          $scope.caret = {
            "pos": caret,
            "name": $scope.name
          };
          
          var data = {};
          data.caret = $scope.caret;
          data.text = $scope.textinput;
          
          socket.emit('changetext', data);
 
          //$scope.insertcaretandparse($scope.caret);
          $scope.render();
          
          //$scope.textparsed = parsemessage($scope.textcareted);
          //$scope.textoutput = $scope.textparsed;
          //$scope.insertcaret($scope.caret);
          
          //$scope.$apply();
          
          //textinputdiv.style.height = 'auto';
          //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
          //$scope.disableinput = true;
        };
        */
        /*
        $scope.changeHtml = function changeHtml() {
          console.log("changed html");
          
          var text = textoutputdiv.textContent || textoutputdiv.innerText;
          
          var data = {};
          data.caret = doGetCaretPosition(textinputdiv);
          data.text = text;
          
          console.log(data);
          
          socket.emit('changetext', data);
          //$scope.textinput = text;
          
          //$scope.textoutput = parsemessage($scope.textinput);
          //$scope.$apply();
          
          //textinputdiv.style.height = 'auto';
          //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
          //$scope.disableinput = true;
        };
        
        $scope.charEvent = function charEvent($event) {
          console.log("getting char");
          
          
          var charCode = $event.which || $event.keyCode;
          var charTyped = String.fromCharCode(charCode);
          
          var data = {};
          data.caret = getCaretCharacterOffsetWithin(textinputdiv);
          data.char = charTyped;
          
          //socket.emit('charinput', data);
          console.log($event);

          //$scope.textoutput = parsemessage($scope.textinput);
          //$scope.$apply();
          
          //textinputdiv.style.height = 'auto';
          //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
          //$scope.disableinput = true;
          //$event.preventDefault();
          
        };
        */
        /*
        $scope.inputEvent = function inputEvent($event) {
          console.log("getting input");
          
          
          var charCode = $event.which || $event.keyCode;
          var charTyped = String.fromCharCode(charCode);
          
          var data = {};
          data.caret = doGetCaretPosition(textoutputdiv);
          data.char = charCode;
          
          //socket.emit('charinput', data);
          console.log($event);

          //$scope.textoutput = parsemessage($scope.textinput);
          //$scope.$apply();
          
          //textinputdiv.style.height = 'auto';
          //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
          //$scope.disableinput = true;
          $event.preventDefault();
          
          $scope.caret = getCaretCharacterOffsetWithin(textoutputdiv);
          console.log($scope.caret);
          
          var e = $.Event($event.type);
          e.keyCode = charCode; // enter
          $(textinputdiv).trigger(e);
        };
        */

        $scope.mousemove = function($event) {
          $scope.mousedata = $event;
          $scope.cursor = {
            "x": $event.pageX,
            "y": $event.pageY,
            "text": $scope.username
          };
          socket.emit('mousemove', $scope.cursor);
        };
        
        $scope.caretmove = function($event) {
          var caret = getCaretPosition(textinputdiv);
          
          $scope.caret = {
            "pos": caret,
            "name": $scope.username
          };
          socket.emit('caretmove', $scope.caret);
          
          $scope.render();
          
          //$scope.textoutput = $scope.textparsed;
          //$scope.insertcaret($scope.caret);
        };
        /*
        $scope.render = function() {
          var text = $scope.textinput;
          var caret = $scope.caret;
          if (caret.pos<0)
          {
            caret.pos = $scope.textinput.length;
          }
          var carethtml = '<span class="caret" alt="' + caret.name + '"></span>';
          $scope.textoutput = parsemessage(escapehtml(text.slice(0, caret.pos))) + carethtml + parsemessage(escapehtml(text.slice(caret.pos)));
          $scope.caret = caret;
          //console.log($scope.textinput);
        }*/
        //$scope.$apply();
      });
      
      /*
//rest
var textinputdiv = document.getElementById("textinput");
      var textoutputdiv = document.getElementById("textoutput");
      var usernamediv = document.getElementById("username");
      function getfocus()
      {
        //var div = document.getElementById("textinput");
        //div.focus();
      }
      
      $("#textinput").keyup(function(e) {
        textinputdiv.style.height = 'auto';
        textinputdiv.style.height = textinputdiv.scrollHeight+'px';
        while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
            $(this).height($(this).height()+1);
        };
      });
      
      $("#textoutput").keyup(function(e) {
        getfocus();
        //console.log("typing");
        //textinputdiv.style.height = 'auto';
        //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
        //while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
        //    $(this).height($(this).height()+1);
        //};
      });
      $("body").keyup(function(e) {
        getfocus();
        //console.log("typing");
        //textinputdiv.style.height = 'auto';
        //textinputdiv.style.height = textinputdiv.scrollHeight+'px';
        //while($(this).outerHeight() < this.scrollHeight + parseFloat($(this).css("borderTopWidth")) + parseFloat($(this).css("borderBottomWidth"))) {
        //    $(this).height($(this).height()+1);
        //};
      });
      getfocus();
      
*/

  document.getElementById("guide").innerHTML = catparsehelp;
  
  var visible = true;
  var unreadcount = 0;
  var originaltitle = document.title;
	$(window).blur(function(){
		if (!visible)
		{
			return;
		}
		visible = false;
		document.title = "0 unread";
	});
	$(window).focus(function(){
		if (visible)
		{
			return;
		}
		//$("#teksti").focus();
		visible = true;
		document.title = originaltitle;
		unreadcount = 0;
	});
	
	var msgsound = new Audio("msg.mp3");
  function popup(title, message) 
  {
    if (!Notification) {
      console.log('Notifications are supported in modern versions of Chrome, Firefox, Opera and Firefox.'); 
      return;
    }
  
    if (Notification.permission !== "granted")
      Notification.requestPermission();
  
    var notification = new Notification(title, {
      icon: '/img/notification.png',
      body: message,
    });
    
    //notification.hide();
    //$(notification).fadeIn('slow');
    
    setTimeout(function () {
  		notification.close();
  	}, 6000);
  
    notification.onclick = function () {
      notification.close();
      //window.open("http://stackoverflow.com/a/13328397/1269037");      
    };
    

  }
  
  function notify(msg, popups)
  {
    if (visible)
    {
      return;
    }
    if (popups)
    {
      msgsound.play();
      var title = escapehtml(msg.user.username);
      var message = escapehtml(msg.text);
  
  	
      var contentmessage = false;
  		if (contentmessage)
  		{
  			popup(title, "(embed content)\n" + message);
  		}
  		else
  		{
  			popup(title, message);
  		}
    }


		unreadcount++;
		document.title = unreadcount + " unread";
  }