//This class should be used to connect to TikTok Live WebSocket and handle messages. 
//Inside game.js, you should call setAccessToken(token) before connect() to set the access token.

class TikTokClient {
    constructor(liveId) {
        // target liveId.
        this.liveId = liveId;
        this.serverUrl = null;
        this.socket = null;
        this.callbacks = {};
        this.accessToken = null; // access token for auth (will be set on backend side)
    }

    // this function should be called inside game.js before connect()
    setAccessToken(token) {
        console.log("Setting access token:", token);
        //if token is null get it from url params token=XXXX
        if (!token || token.trim() === "") {
            const urlParams = new URLSearchParams(window.location.search);
            token = urlParams.get('token');
        }
        if (!token) {
            // throw error in ENGLISH if null
            throw new Error("Access token is required. Please provide it in the URL as 'token');");
        }
        this.accessToken = token;

        // Construye la URL COMPLETA aquí y solo aquí.
        this.serverUrl = `wss://chattokgames-001-site1.ntempurl.com/tiktokHub?access_token=${this.accessToken}`;
        console.log("Access token set. Final Server URL:", this.serverUrl);
    }

    on(eventName, callback) {
        if (!this.callbacks[eventName]) {
            this.callbacks[eventName] = [];
        }
        this.callbacks[eventName].push(callback);
    }

    _trigger(eventName, data) {
        if (this.callbacks[eventName]) {
            this.callbacks[eventName].forEach(callback => {
                try {
                    callback(data);
                } catch (e) {
                    console.error(`Error en el callback del evento '${eventName}':`, e);
                }
            });
        }
    }

    connect() {
        if (!this.accessToken) {
            throw new Error("El token de acceso no ha sido establecido. Usa setAccessToken(token) antes de conectar.");
        }
        console.log("Iniciando conexión con WebSocket nativo... hacia:", this.serverUrl);
        this.socket = new WebSocket(this.serverUrl);

        // --- Evento: Conexión Abierta ---
        // Una vez que el socket esté listo, enviamos los mensajes manuales.
        this.socket.onopen = () => {
            console.log("WebSocket conectado. Enviando mensajes de protocolo manuales...");
            this._trigger('connected');

            // Carácter especial de final de registro de SignalR.
            const recordSeparator = '\u001e';

            // Mensaje 1: Handshake del protocolo.
            const handshakeMessage = `{"protocol":"json","version":1}${recordSeparator}`;

            // Mensaje 2: Invocación para unirse al live.
            // Usamos el this.liveId del constructor.
            const joinMessage = `{"type":1,"invocationId":"1","target":"JoinLiveStream","arguments":["${this.liveId}", {}]}${recordSeparator}`;

            // Enviamos los mensajes al servidor.
            this.socket.send(handshakeMessage);
            this.socket.send(joinMessage);

            console.log("Mensajes de handshake e invocación enviados.");
        };

        // --- Evento: Mensaje Recibido ---
        // Procesamos los datos que llegan del servidor.
        this.socket.onmessage = (event) => {
            // Un solo paquete del servidor puede contener varios mensajes JSON,
            // separados por el carácter especial. Los separamos para procesarlos individualmente.
            const messages = event.data.split('\u001e');

            messages.forEach(messageString => {
                if (!messageString) {
                    return; // Ignoramos separadores vacíos.
                }

                try {
                    const message = JSON.parse(messageString);

                    // Ignoramos los mensajes de "ping" de SignalR (type: 6).
                    if (message.type === 6) {
                        return;
                    }

                    // Buscamos el mensaje que contiene los datos de TikTok.
                    if (message.target === 'rawTikTokMessage' && message.arguments && message.arguments[0]) {
                        const messageData = message.arguments[0];
                        const { method, payload } = messageData;

                        const binaryString = atob(payload);
                        const bytes = new Uint8Array(binaryString.length);
                        for (let i = 0; i < binaryString.length; i++) {
                            bytes[i] = binaryString.charCodeAt(i);
                        }
                        this._handleMessage(method, bytes);
                    }
                } catch (e) {
                    // console.warn("No se pudo parsear un mensaje entrante:", messageString);
                }
            });
        };

        // --- Evento: Error ---
        this.socket.onerror = (error) => {
            console.error("Error de WebSocket:", error);
            this._trigger('disconnected', 'Error en la conexión WebSocket');
        };

        // --- Evento: Conexión Cerrada ---
        this.socket.onclose = (event) => {
            console.warn(`WebSocket cerrado: Código ${event.code}, Razón: ${event.reason}`);
            this._trigger('disconnected', `Conexión cerrada (código: ${event.code})`);
        };
    }

    _handleMessage(method, bytes) {
        // Esta función no necesita cambios, sigue deserializando Protobuf.
        const messageType = method.startsWith("Webcast") ? method.substring(7) : method;
        try {
            let deserializedMessage;
            console.log(`Deserializando mensaje de tipo: ${messageType}`);
            switch (messageType) {
                case 'ChatMessage':
                    deserializedMessage = proto.TikTok.Messages.ChatMessage.deserializeBinary(bytes);
                    this._trigger('chat', deserializedMessage.toObject());
                    break;
                case 'LikeMessage':
                    deserializedMessage = proto.TikTok.Messages.LikeMessage.deserializeBinary(bytes);
                    this._trigger('like', deserializedMessage.toObject());
                    break;
                case 'SocialMessage':
                    deserializedMessage = proto.TikTok.Messages.SocialMessage.deserializeBinary(bytes);
                    this._trigger('social', deserializedMessage.toObject());
                    break;
                case 'GiftMessage':
                    deserializedMessage = proto.TikTok.Messages.GiftMessage.deserializeBinary(bytes);
                    this._trigger('gift', deserializedMessage.toObject());
                    break;
                case 'MemberMessage':
                    deserializedMessage = proto.TikTok.Messages.MemberMessage.deserializeBinary(bytes);
                    this._trigger('join', deserializedMessage.toObject());
                    break;
                case 'SocialMessage':
                    try {
                        let followMsg = proto.TikTok.Messages.SocialMessage.deserializeBinary(bytes);
                        this._trigger('follow', followMsg.toObject());
                    } catch (e) {
                        let shareMsg = proto.TikTok.Messages.ShareMessage.deserializeBinary(bytes);
                        this._trigger('share', shareMsg.toObject());
                    }
                    break;
                case 'ControlMessage':
                    deserializedMessage = proto.TikTok.Messages.ControlMessage.deserializeBinary(bytes);
                    this._trigger('control', deserializedMessage.toObject());
                    break;
                case 'RoomMessage':
                    deserializedMessage = proto.TikTok.Messages.RoomMessage.deserializeBinary(bytes);
                    this._trigger('room', deserializedMessage.toObject());
                    break;
                case 'RoomUserSeqMessage':
                    deserializedMessage = proto.TikTok.Messages.RoomUserSeqMessage.deserializeBinary(bytes);
                    this._trigger('roomUserSeq', deserializedMessage.toObject());
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.error(`Error deserializando el mensaje '${messageType}':`, error);
        }
    }
}