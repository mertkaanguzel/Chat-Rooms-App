const app = document.getElementById('app');
const login = document.querySelector('#login');
const signup = document.querySelector('#signup');
const chatrooms = document.getElementById('chatrooms');
const messages = document.getElementById('messages');
const chatroomList = document.getElementById('chatroom-list');
const messageList = document.getElementById('message-list');
const createChatroomForm = document.getElementById('create-chatroom-form');
const sendMessageForm = document.getElementById('send-message-form');
const chatroomNameInput = document.getElementById('chatroom-name');
const messageInput = document.getElementById('message-input');
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
  for (const message of currentChatroom.messages) {
    const li = document.createElement('li');
    const user = users.find((u) => u.id === message.userId);
    li.textContent = `${user.username}: ${message.text}`;
    messageList.appendChild(li);
  }
}

async function handleLogin(event) {
  event.preventDefault();
  const email = login.querySelector("#email").value;
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
    currentUser = responseId;
    users.push(currentUser);
    message.innerHTML = 'Sign up Successfull';
    await setTimeout(() => {
      message.innerHTML = '';
      showChatrooms();
    }, '3000');
    return;
  }

  let responseMessage = await response.json();
  message.innerHTML = responseMessage.error
  setTimeout(() => {
      message.innerHTML = '';
    }, '3000');

}

async function handleSignup(event) {
  event.preventDefault();
  const email = signup.querySelector("#email").value;
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

  message.innerHTML = responseMessage.error
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
  const url = `http://localhost:3000/rooms/${currentUser}`;
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
    let responseId = await response.json();
    console.log(responseId);
    currentChatroom = {
      id: responseId,
      name: chatRoomName,
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
  console.log(typeof chatroomId);
  currentChatroom = chatRooms.find((cr) => cr.id ==+ Number(chatroomId));
  showMessages();
  renderMessageList();
}

function handleSendMessage(event) {
  event.preventDefault();
  const messageText = messageInput.value.trim();
  if (messageText) {
    const message = {
      userId: currentUser.id,
      text: messageText
    };
    currentChatroom.messages.push(message);
    saveChatRooms();
    renderMessageList();
    messageInput.value = '';
  }
}

socket.on('room-created', room => {
  const roomElement = document.createElement('div')
  roomElement.innerText = room
  const roomLink = document.createElement('a')
  roomLink.href = `/${room}`
  roomLink.innerText = 'join'
  roomContainer.append(roomElement)
  roomContainer.append(roomLink)
})

function init() {
  login.addEventListener('submit', handleLogin);
  signup.addEventListener('submit', handleSignup);
  createChatroomForm.addEventListener('submit', handleCreateChatroom);
  chatroomList.addEventListener('click', (event) => {
    if (event.target.nodeName === 'LI') {
      handleJoinChatroom(event);
    }
  });
  sendMessageForm.addEventListener('submit', handleSendMessage);
  showLoginAndSignup();
}

init();