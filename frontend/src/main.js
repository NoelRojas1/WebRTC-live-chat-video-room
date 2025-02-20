import { connectToSocket } from './lib/socket-client.js';

let localStream;
let remoteStream;
let peerConnection;

// grab roomId
const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const roomId = urlParams.get('roomId');

// send user to lobby if no roomId found
if(!roomId) {
    window.location = 'lobby';
}

const servers = {
    iceServers: [
        {
            urls:['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
        }
    ]
}

async function init() {
    localStream = await navigator.mediaDevices.getUserMedia({
        video: {
            width: {
                min: 640, ideal: 1920, max: 1920
            },
            height: {
                min: 480, ideal: 1080, max: 1080
            }
        },
        audio: true
    });
    document.getElementById('user-1').srcObject = localStream;

    const socket = await connectToSocket();
    // join room
    socket.emit("join-room", roomId);

    socket.on('user-joined', handleUserJoined);
    socket.on('message-from-peer', handleMessageFromPeer);
    socket.on('left', handleUserLeft);
}

const handleMessageFromPeer = async (data) => {
    console.log("Received a message from peer", data.sender, data);

    if(data.type === "offer") {
        // create answer
        await createAnswer(data.sender, data.offer);
    }

    if(data.type === "answer") {
        // create answer
        await addAnswer(data.answer);
    }

    if(data.type === "candidate") {
        // add ice candidate
        if(peerConnection) {
            await peerConnection.addIceCandidate(data.candidate);
        }
    }
}

const handleUserJoined = async (userId) => {
    console.log('A new user has joined:', userId);
    await createOffer(userId);
}

const handleUserLeft = (userId) => {
    console.log('A user has left:', userId);
    document.getElementById('user-2').style.display = 'none';

    // make user-1 big
    document.getElementById('user-1').classList.remove('small-frame');
}

async function createPeerConnection (userId) {
    // get socketConn
    const socket = await connectToSocket();

    // create peer connection
    peerConnection = new RTCPeerConnection(servers);
    remoteStream = new MediaStream();
    document.getElementById('user-2').srcObject = remoteStream;
    document.getElementById('user-2').style.display = 'block';

    // make user-1 small
    document.getElementById('user-1').classList.add('small-frame');

    // add localStream tracks to peer connection
    localStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStream);
    });

    // listen for peer tracks
    peerConnection.addEventListener('track', (event) => {
        event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
        })
    });

    // generate ice candidates
    peerConnection.addEventListener('icecandidate', (event) => {
        if(event.candidate) {
            // send candidate to peer
            socket.emit('ice-candidate', {
                roomId,
                candidate: event.candidate
            });
        }
    });
}

async function createOffer(userId) {
    // create peer connection
    await createPeerConnection(userId);

    // get socketConn
    const socket = await connectToSocket();

    // create offer
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    // send offer to peer
    socket.emit('offer', {
        roomId,
        offer
    });
}

async function createAnswer (userId, offer) {
    // create peer connection
    await createPeerConnection(userId);

    // get socketConn
    const socket = await connectToSocket();

    // set remote description
    await peerConnection.setRemoteDescription(offer);

    // create answer
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    // send answer to peer
    socket.emit('answer', {
        roomId,
        answer,
    });
}

async function addAnswer(answer) {
    if(!peerConnection.currentRemoteDescription) {
        // set remote description for peer (answer)
        await peerConnection.setRemoteDescription(answer);
    }
}


// controls
const toggleCamera = async () => {
    const videoTrack = localStream.getTracks().find(track => track.kind === 'video');
    if(videoTrack.enabled) {
        videoTrack.enabled = false;
        document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        videoTrack.enabled = true;
        document.getElementById('camera-btn').style.backgroundColor = 'rgba(179, 102, 249, 0.9)';
    }
}

const toggleMic = async () => {
    const audioTrack = localStream.getTracks().find(track => track.kind === 'audio');
    const element = document.querySelector('#mic-btn');
    if(audioTrack.enabled) {
        audioTrack.enabled = false;
        element.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';
        element.style.backgroundColor = 'rgb(255, 80, 80)';
    } else {
        audioTrack.enabled = true;
        element.innerHTML = '<i class="fa-solid fa-microphone"></i>';
        element.style.backgroundColor = 'rgba(179, 102, 249, 0.9)';
    }
}

document.getElementById('camera-btn').addEventListener('click', toggleCamera);
document.getElementById('mic-btn').addEventListener('click', toggleMic);

init();