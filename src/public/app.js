/* eslint-disable no-undef */
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
const socket = io('http://localhost:3000');
/*
interface User {
  id: number;
  username: string;
  password: string;
}

interface ChatRoom {
  id: number;
  name: string;
  members: number[];
  messages: Message[];
}

interface Message {
  userId: number;
  text: string;
}
*/
/*
let users = [
  {
    id: 123,
    username: 'user123',
    password: '123',
  },
];

let currentUser = users[0];

let chatRooms = [
  {
    id: 123,
    name: 'chatroom1',
    members: [123],
    messages: [
      {
        userId: 123,
        text: 'Hello World',
      },
    ],
  },
];

let currentChatroom = chatRooms[0];
*/

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
}

function showChatrooms() {
    login.style.display = 'none';
    signup.style.display = 'none';
    chatrooms.style.display = 'block';
    messages.style.display = 'none';
}

function showMessages() {
    login.style.display = 'none';
    signup.style.display = 'none';
    chatrooms.style.display = 'block';
    messages.style.display = 'block';
}

function renderChatroomList() {
    chatroomList.innerHTML = '';
    /*
    for (const chatRoom of chatRooms) {
      if (chatRoom.members.includes(currentUser.id)) {
        const li = document.createElement('li');
        li.textContent = chatRoom.name;
        li.dataset.chatroom = chatRoom.id;
        chatroomList.appendChild(li);
      }
    }
    */
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
        //const user = users.find((u) => u.id === message.userId);
        //li.textContent = `${user.username}: ${message.text}`;
        li.textContent = `${message.userId}: ${message.text}`;
        messageList.appendChild(li);
    }
    /*
    const message =  currentChatroom.messages.slice(-1);
    console.log(message);
    const li = document.createElement('li');
    li.textContent = `${message.userId}: ${message.text}`;
    messageList.appendChild(li);
    */
}

async function handleLogin(event) {
    event.preventDefault();
    const email = login.querySelector('#email').value;
    const password = login.querySelector('#password').value;
    const message = login.querySelector('#message');
    /*
  const user = users.find((u) => u.username === username && u.password === password);
  if (user) {
    currentUser = user;
    showChatrooms();
    renderChatroomList();
  } else {
    alert('Invalid username or password.');
  }
  */
    const url = 'http://localhost:3000/auth';

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
        console.log(responseId);
        currentUser = {
            id: responseId?._id,
            name: '',
            socketId: socket.id,
        };
        users.push(currentUser);
        message.innerHTML = 'Login Successfull';

        const url = `http://localhost:3000/rooms/${currentUser.id}`;
        console.log(url);
        let responseRooms = await fetch(url, {
            method: 'GET',
        });
        console.log(responseRooms.status);
        if (responseRooms.status === 200) {
            let roomsArray = await responseRooms.json();
            console.log('hey');
            console.log(roomsArray);
            roomsArray.forEach(room => {
                chatRooms.push({
                    id: room._id,
                    name: room.name,
                    messages: [],

                });
            });
            /*
          message.innerHTML = 'Sign up Successfull';
          await setTimeout(() => {
            message.innerHTML = '';
            showChatrooms();
          }, '3000');
          return;
          */
            alert('Chat rooms listed successfully'); // just for now
            showChatrooms(); //before that fetch users rooms
            renderChatroomList();
            return;
        }
      
        let responseRoomsMessage = await responseRooms.json();
        alert(responseRoomsMessage.error); // just for now



        await setTimeout(() => {
            message.innerHTML = '';
            showChatrooms(); //before that fetch users rooms
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
    const url = 'http://localhost:3000/users';

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
    
    /*
    if (chatroomName) {
      const chatRoom = {
        id: Date.now(),
        name: chatroomName,
        members: [currentUser.id],
        messages: []
      };
      chatRooms.push(chatRoom);
      saveChatRooms();
      renderChatroomList();
      chatroomNameInput.value = '';
    }
    */
    // post request to rooms/
    const url = `http://localhost:3000/rooms/${currentUser.id}`;
    console.log(url);
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
    console.log(statusCode);
  
    if (statusCode === 200) {
        let result = await response.json();
        console.log(result);
        currentChatroom = {
            id: result.id.toString(),
            name: chatRoomName,
            messages: [],
        };
        chatRooms.push(currentChatroom);
        /*
      message.innerHTML = 'Sign up Successfull';
      await setTimeout(() => {
        message.innerHTML = '';
        showChatrooms();
      }, '3000');
      return;
      */
        alert('Chat room created successfully'); // just for now
        //saveChatRooms();
        renderChatroomList();
        chatroomNameInput.value = '';
        return;
    }
  
    let responseMessage = await response.json();
    alert(responseMessage.error); // just for now
    /*
    message.innerHTML = responseMessage.error
    setTimeout(() => {
        message.innerHTML = '';
      }, '3000');
      */
}
function handleJoinChatroom(event) {
    event.preventDefault();
    const chatroomId = event.target.dataset.chatroom;
    console.log(chatroomId);
    console.log(chatRooms);
    currentChatroom = chatRooms.find((cr) => cr.id === chatroomId);
    console.log({works: currentChatroom});
    const userId = currentUser.id;
    //socket.data.id = socket.id;
    socket.emit('new-user', chatroomId, userId, socket.id);
    showMessages();
    renderMessageList();
}

socket.on('user-connected', (chatroomId, userId, socketId) => {
    console.log('user-connected');
    //console.log('socketId' , socket.id);
    const isCurrentRoom = currentChatroom.id === chatroomId;
    console.log('isCurrentRoom' , isCurrentRoom);
    //if(!roomFound) return;
    const newUser = {
        id: userId,
        name: '',
        socketId,
    };
    users.push(newUser);
    const message = {
        userId: userId,//currentUser.id,
        text: `${userId} connected`,
    };
    //currentChatroom = chatRooms.find((cr) => cr.id === chatroomId);
    //currentChatroom.messages.push(message);
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
    console.log({
        roomId: currentChatroom.id,
        roomName: currentChatroom.name,
    })
    const messageText = messageInput.value.trim();
    if (!messageText) {
        alert('Please enter a message');
        return;
    }
    /*
    if (messageText) {
        const message = {
            userId: currentUser.id,
            text: messageText,
        };
        currentChatroom.messages.push(message);
        saveChatRooms();
        renderMessageList();
        messageInput.value = '';
    }
    */
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
    /*
    for (let cr of chatRooms) {
        if (cr.id === chatroomId) cr.messages.push(message);
    }
    */
    console.log('chat-message');
    //currentChatroom.messages.push(message);
    //cchatRooms.find((cr) => cr.id === chatroomId);
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
    const url = `http://localhost:3000/rooms/${userInput}`;
    console.log(url);
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
    console.log('user-disconnected');
    const disconnectedUser =  users.find((user) => user.socketId === socketId);
    const message = {
        userId: disconnectedUser.id,//currentUser.id,
        text: `${disconnectedUser.id} disconnected`,
    };
    /*
    currentChatroom = chatRooms.find((cr) => cr.id === chatroomId);
    currentChatroom.messages.push(message);
    renderMessageList();
    */
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
    createChatroomForm.addEventListener('submit', handleCreateChatroom);
    chatroomList.addEventListener('click', (event) => {
        if (event.target.nodeName === 'LI') {
            handleJoinChatroom(event);
        }
    });
    sendMessageForm.addEventListener('submit', handleSendMessage);
    addUserForm.addEventListener('submit', handleAddUser);
    if (isSuccess) {
        showChatrooms(); //before that fetch users rooms
        renderChatroomList();
    } else {
        showLoginAndSignup();
    }
}

init();

async function handleStartup() {
    let isSuccess = false;
 
    const url = 'http://localhost:3000/userId';

    let response = await fetch(url, {
        method: 'GET',
    });

    const statusCode = response.status;

    if (statusCode === 200) {
        let responseId = await response.json();
        console.log(responseId);
        currentUser = {
            id: responseId?._id,
            name: '',
            socketId: socket.id,
        };
        users.push(currentUser);

        const url = `http://localhost:3000/rooms/${currentUser.id}`;
        let responseRooms = await fetch(url, {
            method: 'GET',
        });

        if (responseRooms.status === 200) {
            let roomsArray = await responseRooms.json();
            console.log('hey');
            console.log(roomsArray);
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