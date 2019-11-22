/* eslint-disable */
/*
 *  Glue - Robust Go and Javascript Socket Library
 *  Copyright (C) 2015  Roland Singer <roland.singer[at]desertbit.com>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

var glue = function(host, options) {
    // Turn on strict mode.
    'use strict';

    /**
     * Initialize a new `Emitter`.
     *
     * @api public
     */

    function Emitter(obj) {
        if (obj) return mixin(obj);
    }
    
    /**
     * Mixin the emitter properties.
     *
     * @param {Object} obj
     * @return {Object}
     * @api private
     */
    
    function mixin(obj) {
        for (var key in Emitter.prototype) {
        obj[key] = Emitter.prototype[key];
        }
        return obj;
    }
    
    /**
     * Listen on the given `event` with `fn`.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.on =
    Emitter.prototype.addEventListener = function(event, fn){
        this._callbacks = this._callbacks || {};
        (this._callbacks['$' + event] = this._callbacks['$' + event] || [])
        .push(fn);
        return this;
    };
    
    /**
     * Adds an `event` listener that will be invoked a single
     * time then automatically removed.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.once = function(event, fn){
        function on() {
        this.off(event, on);
        fn.apply(this, arguments);
        }
    
        on.fn = fn;
        this.on(event, on);
        return this;
    };
    
    /**
     * Remove the given callback for `event` or all
     * registered callbacks.
     *
     * @param {String} event
     * @param {Function} fn
     * @return {Emitter}
     * @api public
     */
    
    Emitter.prototype.off =
    Emitter.prototype.removeListener =
    Emitter.prototype.removeAllListeners =
    Emitter.prototype.removeEventListener = function(event, fn){
        this._callbacks = this._callbacks || {};
    
        // all
        if (0 === arguments.length) {
        this._callbacks = {};
        return this;
        }
    
        // specific event
        var callbacks = this._callbacks['$' + event];
        if (!callbacks) return this;
    
        // remove all handlers
        if (1 == arguments.length) {
        delete this._callbacks['$' + event];
        return this;
        }
    
        // remove specific handler
        var cb;
        for (var i = 0; i < callbacks.length; i++) {
        cb = callbacks[i];
        if (cb === fn || cb.fn === fn) {
            callbacks.splice(i, 1);
            break;
        }
        }
        return this;
    };
    
    /**
     * Emit `event` with the given args.
     *
     * @param {String} event
     * @param {Mixed} ...
     * @return {Emitter}
     */
    
    Emitter.prototype.emit = function(event){
        this._callbacks = this._callbacks || {};
        var args = [].slice.call(arguments, 1), callbacks = this._callbacks['$' + event];
    
        if (callbacks) {
        callbacks = callbacks.slice(0);
        for (var i = 0, len = callbacks.length; i < len; ++i) {
            callbacks[i].apply(this, args);
        }
        }
    
        return this;
    };
    
    /**
     * Return array of callbacks for `event`.
     *
     * @param {String} event
     * @return {Array}
     * @api public
     */
    
    Emitter.prototype.listeners = function(event){
        this._callbacks = this._callbacks || {};
        return this._callbacks['$' + event] || [];
    };
    
    /**
     * Check if this emitter has `event` handlers.
     *
     * @param {String} event
     * @return {Boolean}
     * @api public
     */
    
    Emitter.prototype.hasListeners = function(event){
        return !! this.listeners(event).length;
    };
    
    var newWebSocket = function () {
        /*
        * Variables
        */

        var s = {},
            ws;



        /*
        * Socket layer implementation.
        */

        s.open = function () {
            try {
                // Generate the websocket url.
                var url;
                if (host.match("^https://")) {
                    url = "wss" + host.substr(5);
                } else {
                    url = "ws" + host.substr(4);
                }
                url += options.baseURL + "ws";

                // Open the websocket connection
                ws = new WebSocket(url);

                // Set the callback handlers
                ws.onmessage = function(event) {
                    s.onMessage(event.data.toString());
                };

                ws.onerror = function(event) {
                    var msg = "the websocket closed the connection with ";
                    if (event.code) {
                        msg += "the error code: " + event.code;
                    }
                    else {
                        msg += "an error.";
                    }

                    s.onError(msg);
                };

                ws.onclose = function() {
                    s.onClose();
                };

                ws.onopen = function() {
                    s.onOpen();
                };
            } catch (e) {
                s.onError();
            }
        };

        s.send = function (data) {
            // Send the data to the server
            ws.send(data);
        };

        s.reset = function() {
            // Close the websocket if defined.
            if (ws) {
                ws.close();
            }

            ws = undefined;
        };

        return s;
    };
    var newAjaxSocket = function () {
        /*
        * Constants
        */

        var ajaxHost = host + options.baseURL + "ajax",
            sendTimeout = 8000,
            pollTimeout = 45000;

        var PollCommands = {
            Timeout:    "t",
            Closed:     "c"
        };

        var Commands = {
            Delimiter:  "&",
            Init:       "i",
            Push:       "u",
            Poll:       "o"
        };



        /*
        * Variables
        */

        var s = {},
            uid, pollToken,
            pollXhr = false,
            sendXhr = false,
            poll;



        /*
        * Methods
        */

        var stopRequests = function() {
            // Set the poll function to a dummy function.
            // This will prevent further poll calls.
            poll = function() {};

            // Kill the ajax requests.
            if (pollXhr) {
                pollXhr.abort();
            }
            if (sendXhr) {
                sendXhr.abort();
            }
        };

        var postAjax = function(url, timeout, data, success, error) {
            var xhr = window.XMLHttpRequest ? new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

            xhr.onload = function() {
            success(xhr.response);
            };

            xhr.onerror = function() {
            error();
            };

            xhr.ontimeout = function() {
            error("timeout");
            };

            xhr.open('POST', url, true);
            xhr.responseType = "text";
            xhr.timeout = timeout;
            xhr.send(data);

            return xhr;
        };

        var triggerClosed = function() {
            // Stop the ajax requests.
            stopRequests();

            // Trigger the event.
            s.onClose();
        };

        var triggerError = function(msg) {
            // Stop the ajax requests.
            stopRequests();

            // Create the error message.
            if (msg) {
                msg = "the ajax socket closed the connection with the error: " + msg;
            }
            else {
                msg = "the ajax socket closed the connection with an error.";
            }

            // Trigger the event.
            s.onError(msg);
        };

        var send = function (data, callback) {
            sendXhr = postAjax(ajaxHost, sendTimeout, data, function (data) {
                sendXhr = false;

                if (callback) {
                    callback(data);
                }
            }, function (msg) {
                sendXhr = false;
                triggerError(msg);
            });
        };

        poll = function () {
            var data = Commands.Poll + uid + Commands.Delimiter + pollToken;

            pollXhr = postAjax(ajaxHost, pollTimeout, data, function (data) {
            pollXhr = false;

            // Check if this jax request has reached the server's timeout.
            if (data == PollCommands.Timeout) {
                // Just start the next poll request.
                poll();
                return;
            }

            // Check if this ajax connection was closed.
            if (data == PollCommands.Closed) {
                // Trigger the closed event.
                triggerClosed();
                return;
            }

            // Split the new token from the rest of the data.
            var i = data.indexOf(Commands.Delimiter);
            if (i < 0) {
                triggerError("ajax socket: failed to split poll token from data!");
                return;
            }

            // Set the new token and the data variable.
            pollToken = data.substring(0, i);
            data = data.substr(i + 1);

            // Start the next poll request.
            poll();

            // Call the event.
            s.onMessage(data);
            }, function (msg) {
                pollXhr = false;
                triggerError(msg);
            });
        };



        /*
        * Socket layer implementation.
        */

        s.open = function () {
            // Initialize the ajax socket session
            send(Commands.Init, function (data) {
                // Get the uid and token string
                var i = data.indexOf(Commands.Delimiter);
                if (i < 0) {
                    triggerError("ajax socket: failed to split uid and poll token from data!");
                    return;
                }

                // Set the uid and token.
                uid = data.substring(0, i);
                pollToken = data.substr(i + 1);

                // Start the long polling process.
                poll();

                // Trigger the event.
                s.onOpen();
            });
        };

        s.send = function (data) {
            // Always prepend the command with the uid to the data.
            send(Commands.Push + uid + Commands.Delimiter + data);
        };

        s.reset = function() {
            // Stop the ajax requests.
            stopRequests();
        };

        return s;
    };



    /*
     * Constants
     */

    var Version         = "1.9.1",
        MainChannelName = "m";

    var SocketTypes = {
        WebSocket:  "WebSocket",
        AjaxSocket: "AjaxSocket"
    };

    var Commands = {
        Len: 	            2,
        Init:               'in',
        Ping:               'pi',
        Pong:               'po',
        Close: 	            'cl',
        Invalid:            'iv',
        DontAutoReconnect:  'dr',
        ChannelData:        'cd'
    };

    var States = {
        Disconnected:   "disconnected",
        Connecting:     "connecting",
        Reconnecting:   "reconnecting",
        Connected:      "connected"
    };

    var DefaultOptions = {
        // The base URL is appended to the host string. This value has to match with the server value.
        baseURL: "/glue/",

        // Force a socket type.
        // Values: false, "WebSocket", "AjaxSocket"
        forceSocketType: false,

        // Kill the connect attempt after the timeout.
        connectTimeout:  10000,

        // If the connection is idle, ping the server to check if the connection is stil alive.
        pingInterval:           35000,
        // Reconnect if the server did not response with a pong within the timeout.
        pingReconnectTimeout:   5000,

        // Whenever to automatically reconnect if the connection was lost.
        reconnect:          true,
        reconnectDelay:     1000,
        reconnectDelayMax:  5000,
        // To disable set to 0 (endless).
        reconnectAttempts:  10,

        // Reset the send buffer after the timeout.
        resetSendBufferTimeout: 10000
    };



    /*
     * Variables
     */

    var emitter                 = new Emitter,
        bs                      = false,
        mainChannel,
        initialConnectedOnce    = false,    // If at least one successful connection was made.
        bsNewFunc,                          // Function to create a new backend socket.
        currentSocketType,
        currentState            = States.Disconnected,
        reconnectCount          = 0,
        autoReconnectDisabled   = false,
        connectTimeout          = false,
        pingTimeout             = false,
        pingReconnectTimeout    = false,
        sendBuffer              = [],
        resetSendBufferTimeout  = false,
        resetSendBufferTimedOut = false,
        isReady                 = false,    // If true, the socket is initialized and ready.
        beforeReadySendBuffer   = [],       // Buffer to hold requests for the server while the socket is not ready yet.
        socketID               = "";


    /*
     * Include the dependencies
     */

    // Exported helper methods for the dependencies.
    var closeSocket, send, sendBuffered;

    var utils = (function() {
        /*
         * Constants
         */
    
        var Delimiter = "&";
    
    
    
        /*
         * Variables
         */
    
         var instance = {}; // Our public instance object returned by this function.
    
    
    
        /*
         * Public Methods
         */
    
        // Mimics jQuery's extend method.
        // Source: http://stackoverflow.com/questions/11197247/javascript-equivalent-of-jquerys-extend-method
        instance.extend = function() {
          for(var i=1; i<arguments.length; i++)
              for(var key in arguments[i])
                  if(arguments[i].hasOwnProperty(key))
                      arguments[0][key] = arguments[i][key];
          return arguments[0];
        };
    
        // Source: http://stackoverflow.com/questions/5999998/how-can-i-check-if-a-javascript-variable-is-function-type.
        instance.isFunction = function(v) {
            var getType = {};
            return v && getType.toString.call(v) === '[object Function]';
        };
    
        // unmarshalValues splits two values from a single string.
        // This function is chainable to extract multiple values.
        // An object with two strings (first, second) is returned.
        instance.unmarshalValues = function(data) {
            if (!data) {
                return false;
            }
    
            // Find the delimiter position.
            var pos = data.indexOf(Delimiter);
    
            // Extract the value length integer of the first value.
            var len = parseInt(data.substring(0, pos), 10);
            data = data.substring(pos + 1);
    
            // Validate the length.
            if (len < 0 || len > data.length) {
                return false;
            }
    
            // Now split the first value from the second.
            var firstV = data.substr(0, len);
            var secondV = data.substr(len);
    
            // Return an object with both values.
            return {
                first:  firstV,
                second: secondV
            };
        };
    
        // marshalValues joins two values into a single string.
        // They can be decoded by the unmarshalValues function.
        instance.marshalValues = function(first, second) {
            return String(first.length) + Delimiter + first + second;
        };
    
    
        return instance;
    })();
    var channel = (function() {
        /*
         * Variables
         */
    
         var instance = {}, // Our public instance object returned by this function.
             channels = {}; // Object as key value map.
    
    
    
         /*
          * Private Methods
          */
    
         var newChannel = function(name) {
             // Create the channel object.
             var channel = {
                 // Set to a dummy function.
                 onMessageFunc: function() {}
             };
    
             // Set the channel public instance object.
             // This is the value which is returned by the public glue.channel(...) function.
             channel.instance = {
                 // onMessage sets the function which is triggered as soon as a message is received.
                 onMessage: function(f) {
                     channel.onMessageFunc = f;
                 },
    
                 // send a data string to the channel.
                 // One optional discard callback can be passed.
                 // It is called if the data could not be send to the server.
                 // The data is passed as first argument to the discard callback.
                 // returns:
                 //  1 if immediately send,
                 //  0 if added to the send queue and
                 //  -1 if discarded.
                 send: function(data, discardCallback) {
                     // Discard empty data.
                     if (!data) {
                         return -1;
                     }
    
                     // Call the helper method and send the data to the channel.
                     return sendBuffered(Commands.ChannelData, utils.marshalValues(name, data), discardCallback);
                 }
             };
    
             // Return the channel object.
             return channel;
         };
    
    
    
         /*
          * Public Methods
          */
    
         // Get or create a channel if it does not exists.
         instance.get = function(name) {
             if (!name) {
                 return false;
             }
    
             // Get the channel.
             var c = channels[name];
             if (c) {
                 return c.instance;
             }
    
             // Create a new one, if it does not exists and add it to the map.
             c = newChannel(name);
             channels[name] = c;
    
             return c.instance;
         };
    
         instance.emitOnMessage = function(name, data) {
             if (!name || !data) {
                 return;
             }
    
             // Get the channel.
             var c = channels[name];
             if (!c) {
                 console.log("glue: channel '" + name + "': emit onMessage event: channel does not exists");
                 return;
             }
    
             // Call the channel's on message event.
             try {
                 c.onMessageFunc(data);
             }
             catch(err) {
                 console.log("glue: channel '" + name + "': onMessage event call failed: " + err.message);
                 return;
             }
         };
    
         return instance;
    })();
    /*
     * Methods
     */

    // Function variables.
    var reconnect, triggerEvent;

    // Sends the data to the server if a socket connection exists, otherwise it is discarded.
    // If the socket is not ready yet, the data is buffered until the socket is ready.
    send = function(data) {
        if (!bs) {
            return;
        }

        // If the socket is not ready yet, buffer the data.
        if (!isReady) {
            beforeReadySendBuffer.push(data);
            return;
        }

        // Send the data.
        bs.send(data);
    };

    // Hint: the isReady flag has to be true before calling this function!
    var sendBeforeReadyBufferedData = function() {
        // Skip if empty.
        if (beforeReadySendBuffer.length === 0) {
            return;
        }

        // Send the buffered data.
        for (var i = 0; i < beforeReadySendBuffer.length; i++) {
            send(beforeReadySendBuffer[i]);
        }

        // Clear the buffer.
        beforeReadySendBuffer = [];
    };

    var stopResetSendBufferTimeout = function() {
        // Reset the flag.
        resetSendBufferTimedOut = false;

        // Stop the timeout timer if present.
        if (resetSendBufferTimeout !== false) {
            clearTimeout(resetSendBufferTimeout);
            resetSendBufferTimeout = false;
        }
    };

    var startResetSendBufferTimeout = function() {
        // Skip if already running or if already timed out.
        if (resetSendBufferTimeout !== false || resetSendBufferTimedOut) {
            return;
        }

        // Start the timeout.
        resetSendBufferTimeout = setTimeout(function() {
            // Update the flags.
            resetSendBufferTimeout = false;
            resetSendBufferTimedOut = true;

            // Return if already empty.
            if (sendBuffer.length === 0) {
                return;
            }

            // Call the discard callbacks if defined.
            var buf;
            for (var i = 0; i < sendBuffer.length; i++) {
                buf = sendBuffer[i];
                if (buf.discardCallback && utils.isFunction(buf.discardCallback)) {
                    try {
                        buf.discardCallback(buf.data);
                    }
                    catch (err) {
                       console.log("glue: failed to call discard callback: " + err.message);
                    }
                }
            }

            // Trigger the event if any buffered send data is discarded.
            triggerEvent("discard_send_buffer");

            // Reset the buffer.
            sendBuffer = [];
        }, options.resetSendBufferTimeout);
    };

    var sendDataFromSendBuffer = function() {
        // Stop the reset send buffer tiemout.
        stopResetSendBufferTimeout();

        // Skip if empty.
        if (sendBuffer.length === 0) {
            return;
        }

        // Send data, which could not be send...
        var buf;
        for (var i = 0; i < sendBuffer.length; i++) {
            buf = sendBuffer[i];
            send(buf.cmd + buf.data);
        }

        // Clear the buffer again.
        sendBuffer = [];
    };

    // Send data to the server.
    // This is a helper method which handles buffering,
    // if the socket is currently not connected.
    // One optional discard callback can be passed.
    // It is called if the data could not be send to the server.
    // The data is passed as first argument to the discard callback.
    // returns:
    //  1 if immediately send,
    //  0 if added to the send queue and
    //  -1 if discarded.
    sendBuffered = function(cmd, data, discardCallback) {
        // Be sure, that the data value is an empty
        // string if not passed to this method.
        if (!data) {
            data = "";
        }

        // Add the data to the send buffer if disconnected.
        // They will be buffered for a short timeout to bridge short connection errors.
        if (!bs || currentState !== States.Connected) {
            // If already timed out, then call the discard callback and return.
            if (resetSendBufferTimedOut) {
                if (discardCallback && utils.isFunction(discardCallback)) {
                    discardCallback(data);
                }

                return -1;
            }

            // Reset the send buffer after a specific timeout.
            startResetSendBufferTimeout();

            // Append to the buffer.
            sendBuffer.push({
                cmd:                cmd,
                data:               data,
                discardCallback:    discardCallback
            });

            return 0;
        }

        // Send the data with the command to the server.
        send(cmd + data);

        return 1;
    };

    var stopConnectTimeout = function() {
        // Stop the timeout timer if present.
        if (connectTimeout !== false) {
            clearTimeout(connectTimeout);
            connectTimeout = false;
        }
    };

    var resetConnectTimeout = function() {
        // Stop the timeout.
        stopConnectTimeout();

        // Start the timeout.
        connectTimeout = setTimeout(function() {
            // Update the flag.
            connectTimeout = false;

            // Trigger the event.
            triggerEvent("connect_timeout");

            // Reconnect to the server.
            reconnect();
        }, options.connectTimeout);
    };

    var stopPingTimeout = function() {
        // Stop the timeout timer if present.
        if (pingTimeout !== false) {
            clearTimeout(pingTimeout);
            pingTimeout = false;
        }

        // Stop the reconnect timeout.
        if (pingReconnectTimeout !== false) {
            clearTimeout(pingReconnectTimeout);
            pingReconnectTimeout = false;
        }
    };

    var resetPingTimeout = function() {
        // Stop the timeout.
        stopPingTimeout();

        // Start the timeout.
        pingTimeout = setTimeout(function() {
            // Update the flag.
            pingTimeout = false;

            // Request a Pong response to check if the connection is still alive.
            send(Commands.Ping);

            // Start the reconnect timeout.
            pingReconnectTimeout = setTimeout(function() {
                // Update the flag.
                pingReconnectTimeout = false;

                // Trigger the event.
                triggerEvent("timeout");

                // Reconnect to the server.
                reconnect();
            }, options.pingReconnectTimeout);
        }, options.pingInterval);
    };

    var newBackendSocket = function() {
        // If at least one successfull connection was made,
        // then create a new socket using the last create socket function.
        // Otherwise determind which socket layer to use.
        if (initialConnectedOnce) {
            bs = bsNewFunc();
            return;
        }

        // Fallback to the ajax socket layer if there was no successful initial
        // connection and more than one reconnection attempt was made.
        if (reconnectCount > 1) {
            bsNewFunc = newAjaxSocket;
            bs = bsNewFunc();
            currentSocketType = SocketTypes.AjaxSocket;
            return;
        }

        // Choose the socket layer depending on the browser support.
        if ((!options.forceSocketType && window.WebSocket) ||
            options.forceSocketType === SocketTypes.WebSocket)
        {
            bsNewFunc = newWebSocket;
            currentSocketType = SocketTypes.WebSocket;
        }
        else
        {
            bsNewFunc = newAjaxSocket;
            currentSocketType = SocketTypes.AjaxSocket;
        }

        // Create the new socket.
        bs = bsNewFunc();
    };

    var initSocket = function(data) {
        // Parse the data JSON string to an object.
        data = JSON.parse(data);

        // Validate.
        // Close the socket and log the error on invalid data.
        if (!data.socketID) {
            closeSocket();
            console.log("glue: socket initialization failed: invalid initialization data received");
            return;
        }

        // Set the socket ID.
        socketID = data.socketID;

        // The socket initialization is done.
        // ##################################

        // Set the ready flag.
        isReady = true;

        // First send all data messages which were
        // buffered because the socket was not ready.
        sendBeforeReadyBufferedData();

        // Now set the state and trigger the event.
        currentState = States.Connected;
        triggerEvent("connected");

        // Send the queued data from the send buffer if present.
        // Do this after the next tick to be sure, that
        // the connected event gets fired first.
        setTimeout(sendDataFromSendBuffer, 0);
    };

    var connectSocket = function() {
        // Set a new backend socket.
        newBackendSocket();

        // Set the backend socket events.
        bs.onOpen = function() {
            // Stop the connect timeout.
            stopConnectTimeout();

            // Reset the reconnect count.
            reconnectCount = 0;

            // Set the flag.
            initialConnectedOnce = true;

            // Reset or start the ping timeout.
            resetPingTimeout();

            // Prepare the init data to be send to the server.
            var data = {
                version: Version
            };

            // Marshal the data object to a JSON string.
            data = JSON.stringify(data);

            // Send the init data to the server with the init command.
            // Hint: the backend socket is used directly instead of the send function,
            // because the socket is not ready yet and this part belongs to the
            // initialization process.
            bs.send(Commands.Init + data);
        };

        bs.onClose = function() {
            // Reconnect the socket.
            reconnect();
        };

        bs.onError = function(msg) {
            // Trigger the error event.
            triggerEvent("error", [msg]);

            // Reconnect the socket.
            reconnect();
        };

        bs.onMessage = function(data) {
            // Reset the ping timeout.
            resetPingTimeout();

            // Log if the received data is too short.
            if (data.length < Commands.Len) {
                console.log("glue: received invalid data from server: data is too short.");
                return;
            }

            // Extract the command from the received data string.
            var cmd = data.substr(0, Commands.Len);
            data = data.substr(Commands.Len);

            if (cmd === Commands.Ping) {
                // Response with a pong message.
                send(Commands.Pong);
            }
            else if (cmd === Commands.Pong) {
                // Don't do anything.
                // The ping timeout was already reset.
            }
            else if (cmd === Commands.Invalid) {
                // Log.
                console.log("glue: server replied with an invalid request notification!");
            }
            else if (cmd === Commands.DontAutoReconnect) {
                // Disable auto reconnections.
                autoReconnectDisabled = true;

                // Log.
                console.log("glue: server replied with an don't automatically reconnect request. This might be due to an incompatible protocol version.");
            }
            else if (cmd === Commands.Init) {
                initSocket(data);
            }
            else if (cmd === Commands.ChannelData) {
                // Obtain the two values from the data string.
                var v = utils.unmarshalValues(data);
                if (!v) {
                    console.log("glue: server requested an invalid channel data request: " + data);
                    return;
                }

                // Trigger the event.
                channel.emitOnMessage(v.first, v.second);
            }
            else {
                console.log("glue: received invalid data from server with command '" + cmd + "' and data '" + data + "'!");
            }
        };

        // Connect during the next tick.
        // The user should be able to connect the event functions first.
        setTimeout(function() {
            // Set the state and trigger the event.
            if (reconnectCount > 0) {
                currentState = States.Reconnecting;
                triggerEvent("reconnecting");
            }
            else {
                currentState = States.Connecting;
                triggerEvent("connecting");
            }

            // Reset or start the connect timeout.
            resetConnectTimeout();

            // Connect to the server
            bs.open();
        }, 0);
    };

    var resetSocket = function() {
        // Stop the timeouts.
        stopConnectTimeout();
        stopPingTimeout();

        // Reset flags and variables.
        isReady = false;
        socketID = "";

        // Clear the buffer.
        // This buffer is attached to each single socket.
        beforeReadySendBuffer = [];

        // Reset previous backend sockets if defined.
        if (bs) {
            // Set dummy functions.
            // This will ensure, that previous old sockets don't
            // call our valid methods. This would mix things up.
            bs.onOpen = bs.onClose = bs.onMessage = bs.onError = function() {};

            // Reset everything and close the socket.
            bs.reset();
            bs = false;
        }
    };

    reconnect = function() {
        // Reset the socket.
        resetSocket();

        // If no reconnections should be made or more than max
        // reconnect attempts where made, trigger the disconnected event.
        if ((options.reconnectAttempts > 0 && reconnectCount > options.reconnectAttempts) ||
            options.reconnect === false || autoReconnectDisabled)
        {
            // Set the state and trigger the event.
            currentState = States.Disconnected;
            triggerEvent("disconnected");

            return;
        }

        // Increment the count.
        reconnectCount += 1;

        // Calculate the reconnect delay.
        var reconnectDelay = options.reconnectDelay * reconnectCount;
        if (reconnectDelay > options.reconnectDelayMax) {
            reconnectDelay = options.reconnectDelayMax;
        }

        // Try to reconnect.
        setTimeout(function() {
            connectSocket();
        }, reconnectDelay);
    };

    closeSocket = function() {
        // Check if the socket exists.
        if (!bs) {
            return;
        }

        // Notify the server.
        send(Commands.Close);

        // Reset the socket.
        resetSocket();

        // Set the state and trigger the event.
        currentState = States.Disconnected;
        triggerEvent("disconnected");
    };



    /*
     * Initialize section
     */

    // Create the main channel.
    mainChannel = channel.get(MainChannelName);

    // Prepare the host string.
    // Use the current location if the host string is not set.
    if (!host) {
        host = window.location.protocol + "//" + window.location.host;
    }
    // The host string has to start with http:// or https://
    if (!host.match("^http://") && !host.match("^https://")) {
        console.log("glue: invalid host: missing 'http://' or 'https://'!");
        return;
    }

    // Merge the options with the default options.
    options = utils.extend({}, DefaultOptions, options);

    // The max value can't be smaller than the delay.
    if (options.reconnectDelayMax < options.reconnectDelay) {
        options.reconnectDelayMax = options.reconnectDelay;
    }

    // Prepare the base URL.
    // The base URL has to start and end with a slash.
    if (options.baseURL.indexOf("/") !== 0) {
        options.baseURL = "/" + options.baseURL;
    }
    if (options.baseURL.slice(-1) !== "/") {
        options.baseURL = options.baseURL + "/";
    }

    // Create the initial backend socket and establish a connection to the server.
    connectSocket();



    /*
     * Socket object
     */

    var socket = {
        // version returns the glue socket protocol version.
        version: function() {
            return Version;
        },

        // type returns the current used socket type as string.
        // Either "WebSocket" or "AjaxSocket".
        type: function() {
            return currentSocketType;
        },

        // state returns the current socket state as string.
        // Following states are available:
        //  - "disconnected"
        //  - "connecting"
        //  - "reconnecting"
        //  - "connected"
        state: function() {
            return currentState;
        },

        // socketID returns the socket's ID.
        // This is a cryptographically secure pseudorandom number.
        socketID: function() {
            return socketID;
        },

        // send a data string to the server.
        // One optional discard callback can be passed.
        // It is called if the data could not be send to the server.
        // The data is passed as first argument to the discard callback.
        // returns:
        //  1 if immediately send,
        //  0 if added to the send queue and
        //  -1 if discarded.
        send: function(data, discardCallback) {
            mainChannel.send(data, discardCallback);
        },

        // onMessage sets the function which is triggered as soon as a message is received.
        onMessage: function(f) {
            mainChannel.onMessage(f);
        },

        // on binds event functions to events.
        // This function is equivalent to jQuery's on method syntax.
        // Following events are available:
        //  - "connected"
        //  - "connecting"
        //  - "disconnected"
        //  - "reconnecting"
        //  - "error"
        //  - "connect_timeout"
        //  - "timeout"
        //  - "discard_send_buffer"
        on: function() {
            emitter.on.apply(emitter, arguments);
        },

        // Reconnect to the server.
        // This is ignored if the socket is not disconnected.
        // It will reconnect automatically if required.
        reconnect: function() {
            if (currentState !== States.Disconnected) {
                return;
            }

            // Reset the reconnect count and the auto reconnect disabled flag.
            reconnectCount = 0;
            autoReconnectDisabled = false;

            // Reconnect the socket.
            reconnect();
        },

        // close the socket connection.
        close: function() {
            closeSocket();
        },

        // channel returns the given channel object specified by name
        // to communicate in a separate channel than the default one.
        channel: function(name) {
            return channel.get(name);
        }
    };

    // Define the function body of the triggerEvent function.
    triggerEvent = function() {
        emitter.emit.apply(emitter, arguments);
    };

    // Return the newly created socket.
    return socket;
};
export default glue;