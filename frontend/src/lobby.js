import { connectToSocket } from './lib/socket-client.js';

const form = document.querySelector('#join-form');

async function getRooms() {
    const socket = await connectToSocket();
    socket.emit('get-rooms');

    socket.on('rooms', (rooms) => {
        for (const room in rooms) {
            console.log(room, rooms[room]);

            // TODO: create rooms in lobby
            const roomHtml = `
                <div class="room">
                    <a href="/?roomId=${room}">Join room: ${room}</a>
                </div>
            `;
            document.querySelector('#available-rooms').insertAdjacentHTML('beforeend', roomHtml);
        }
    });
}

getRooms();

form.addEventListener('submit', (e) => {
    e.preventDefault();

    // grab invite link (roomId)
    const inviteCode = e.target.invite_link.value;
    e.target.invite_link.value = '';

    // set roomId in url
    window.location = `/?roomId=${inviteCode}`;
});