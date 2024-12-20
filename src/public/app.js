const app = document.getElementById('app');
const login = document.querySelector('#login');
const signup = document.querySelector('#signup');
const chatrooms = document.getElementById('chatrooms');
const messages = document.getElementById('messages');
const chatroomList = document.getElementById('chatroom-list');
const messageList = document.getElementById('message-list');
const createChatroomForm = document.getElementById('create-chatroom-form');
const chatroomNameInput = document.getElementById('chatroom-name');
const sendMessageForm = document.getElementById('send-message-form');
const messageInput = document.getElementById('message-input');
const addUserForm = document.getElementById('add-user-form');
const addUserInput = document.getElementById('add-user-input');
const logoutForm = document.getElementById('logout-form');
const HostUrl = 'https://chat-rooms-app-production.up.railway.app';
const socket = io(HostUrl);

let users = [];
let currentUser = null;
let chatRooms = [];
let currentChatroom = null;

function loadUsers() {
    const usersString = localStorage.getItem('users');
    if (usersString) {
        users = JSON.parse(usersString);
    }
}

function saveUsers() {
    localStorage.setItem('users', JSON.stringify(users));
}

function loadChatRooms() {
    const chatRoomsString = localStorage.getItem('chatRooms');
    if (chatRoomsString) {
        chatRooms = JSON.parse(chatRoomsString);
    }
}

function saveChatRooms() {
    localStorage.setItem('chatRooms', JSON.stringify(chatRooms));
}

function showLoginAndSignup() {
    login.style.display = 'block';
    signup.style.display = 'block';
    chatrooms.style.display = 'none';
    messages.style.display = 'none';
    logoutForm.style.display = 'none';
}

function showChatrooms() {
    login.style.display = 'none';
    signup.style.display = 'none';
    chatrooms.style.display = 'block';
    messages.style.display = 'none';
    logoutForm.style.display = 'block';
}

function showMessages() {
    login.style.display = 'none';
    signup.style.display = 'none';
    chatrooms.style.display = 'block';
    messages.style.display = 'block';
    logoutForm.style.display = 'block';
}

function renderChatroomList() {
    chatroomList.innerHTML = '';
    for (const chatRoom of chatRooms) {
        const li = document.createElement('li');
        li.textContent = chatRoom.name;
        li.dataset.chatroom = chatRoom.id;
        chatroomList.appendChild(li);
    }
}

function renderMessageList() {
    messageList.innerHTML = '';
    if(!currentChatroom.messages) return;
    for (const message of currentChatroom.messages) {
        if (message.userId === currentUser.id) message.userId = 'You';
        const li = document.createElement('li');
        li.textContent = `${message.userId}: ${message.text}`;
        messageList.appendChild(li);
    }
}

async function handleLogin(event) {
    event.preventDefault();
    const email = login.querySelector('#email').value;
    const password = login.querySelector('#password').value;
    const message = login.querySelector('#message');
    const url = `${HostUrl}/auth`;

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    const statusCode = response.status;

    if (statusCode === 200) {
        let responseId = await response.json();
        currentUser = {
            id: responseId?._id,
            name: '',
            socketId: socket.id,
        };
        users.push(currentUser);
        message.innerHTML = 'Login Successfull';

        const url = `${HostUrl}/${currentUser.id}`;
        let responseRooms = await fetch(url, {
            method: 'GET',
        });
        if (responseRooms.status === 200) {
            let roomsArray = await responseRooms.json();
            roomsArray.forEach(room => {
                chatRooms.push({
                    id: room._id,
                    name: room.name,
                    messages: [],

                });
            });

            alert('Chat rooms listed successfully'); 
            showChatrooms();
            renderChatroomList();
            return;
        }
      
        let responseRoomsMessage = await responseRooms.json();
        alert(responseRoomsMessage.error);



        await setTimeout(() => {
            message.innerHTML = '';
            showChatrooms();
            renderChatroomList();
        }, '3000');
        return;
    }

    let responseMessage = await response.json();
    message.innerHTML = responseMessage.error;
    setTimeout(() => {
        message.innerHTML = '';
    }, '3000');
}

async function handleSignup(event) {
    event.preventDefault();
    const email = signup.querySelector('#email').value;
    const password = signup.querySelector('#password').value;
    const message = signup.querySelector('#message');
    const url = `${HostUrl}/users`;

    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
            email,
            password,
        }),
    });

    let responseMessage = 'Sign up Successfull';
    const statusCode = response.status;

    if (statusCode === 204) {
        message.innerHTML = responseMessage;
        setTimeout(() => {
            message.innerHTML = '';
        }, '3000');
        return;
    }

    responseMessage = await response.json();

    message.innerHTML = responseMessage.error;
    setTimeout(() => {
        message.innerHTML = '';
    }, '3000');
}

async function handleCreateChatroom(event) {
    event.preventDefault();
    const chatRoomName = chatroomNameInput.value.trim();
    if (!chatRoomName) {
        alert('Please enter a room name');
        return;
    }

    const url = `${HostUrl}/${currentUser.id}`;
    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
            room: chatRoomName,
        }),
    });
  
    const statusCode = response.status;
  
    if (statusCode === 200) {
        let result = await response.json();
        currentChatroom = {
            id: result.id.toString(),
            name: chatRoomName,
            messages: [],
        };
        chatRooms.push(currentChatroom);

        alert('Chat room created successfully');
        renderChatroomList();
        chatroomNameInput.value = '';
        return;
    }
  
    let responseMessage = await response.json();
    alert(responseMessage.error);
}
function handleJoinChatroom(event) {
    event.preventDefault();
    const chatroomId = event.target.dataset.chatroom;
    currentChatroom = chatRooms.find((cr) => cr.id === chatroomId);
    const userId = currentUser.id;
    socket.emit('new-user', chatroomId, userId, socket.id);
    showMessages();
    renderMessageList();
}

socket.on('user-connected', (chatroomId, userId, socketId) => {
    const isCurrentRoom = currentChatroom.id === chatroomId;
    const newUser = {
        id: userId,
        name: '',
        socketId,
    };
    users.push(newUser);
    const message = {
        userId: userId,
        text: `${userId} connected`,
    };
    chatRooms.forEach((cr) => {
        if (cr.id === chatroomId) {
            cr.messages.push(message);
        }
    });
    if(chatroomId === currentChatroom.id) renderMessageList();

    //renderMessageList();
});

function handleSendMessage(event) {
    event.preventDefault();
    const messageText = messageInput.value.trim();
    if (!messageText) {
        alert('Please enter a message');
        return;
    }
    const message = {
        userId: 'You',
        text: messageText,
    };
    currentChatroom.messages.push(message);
    renderMessageList();
    messageInput.value = '';
    message.userId = currentUser.id;
    socket.emit('send-chat-message', currentChatroom.id, message);
}

socket.on('chat-message', (chatroomId, message) => {
    chatRooms.forEach((cr) => {
        if (cr.id === chatroomId) {
            cr.messages.push(message);
        }
    });
    if(chatroomId === currentChatroom.id) renderMessageList();
});

async function handleAddUser(event) {
    event.preventDefault();
    const userInput = addUserInput.value.trim();
    if (!userInput) {
        alert('Please enter a user id');
        return;
    }
    const url = `${HostUrl}/${userInput}`;
    let response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json;charset=utf-8',
        },
        body: JSON.stringify({
            roomId: currentChatroom.id,
        }),
    });
  
    const statusCode = response.status;

    if (statusCode === 204) {
        alert('User added to the room succesfully');
        return;
    }

    const responseMessage = await response.json();
    alert(responseMessage.error);
}

socket.on('user-disconnected', (chatroomId, socketId) => {
    const disconnectedUser =  users.find((user) => user.socketId === socketId);
    const message = {
        userId: disconnectedUser.id,//currentUser.id,
        text: `${disconnectedUser.id} disconnected`,
    };
    chatRooms.forEach((cr) => {
        if (cr.id === chatroomId) {
            cr.messages.push(message);
        }
    });
    if(chatroomId === currentChatroom.id) renderMessageList();
});

async function init() {
    const isSuccess = await handleStartup();
    login.addEventListener('submit', handleLogin);
    signup.addEventListener('submit', handleSignup);
    logoutForm.addEventListener('submit', handleLogout);
    createChatroomForm.addEventListener('submit', handleCreateChatroom);
    chatroomList.addEventListener('click', (event) => {
        if (event.target.nodeName === 'LI') {
            handleJoinChatroom(event);
        }
    });
    sendMessageForm.addEventListener('submit', handleSendMessage);
    addUserForm.addEventListener('submit', handleAddUser);
    if (isSuccess) {
        showChatrooms();
        renderChatroomList();
    } else {
        showLoginAndSignup();
    }
}

init();

async function handleStartup() {
    let isSuccess = false;
 
    const url = `${HostUrl}/userId`;

    let response = await fetch(url, {
        method: 'GET',
    });

    const statusCode = response.status;

    if (statusCode === 200) {
        let responseId = await response.json();
        currentUser = {
            id: responseId?._id,
            name: '',
            socketId: socket.id,
        };
        users.push(currentUser);

        const url = `${HostUrl}/${currentUser.id}`;
        let responseRooms = await fetch(url, {
            method: 'GET',
        });

        if (responseRooms.status === 200) {
            let roomsArray = await responseRooms.json();
            roomsArray.forEach(room => {
                chatRooms.push({
                    id: room._id,
                    name: room.name,
                    messages: [],

                });
            });

            isSuccess = true;
        }
      
        return isSuccess;
        
    }
}

async function handleLogout(event) {
    event.preventDefault();
    const url = `${HostUrl}/logout`;

    let response = await fetch(url, {
        method: 'POST',
    });
  
    const statusCode = response.status;

    if (statusCode === 204) {
        alert('Logout successful');
        init();
        return;
    }


    const responseMessage = await response.json();
    alert(responseMessage.error);
}