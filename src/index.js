import { createServer } from 'http';
import socketIo from 'socket.io';
import questions from '../questions.json';

const server = createServer();
const io = socketIo(server);

let isAsking = false;
let currentQuestion = 0;
let broadcasterSocket;
const socketsPlaying = [];
const socketsToBeAdded = [];

const sendQuestion = () => {
  if (isAsking) {
    return;
  }

  const { text, options, correctAnswer } = questions[currentQuestion];

  isAsking = true;
  const votes = [0, 0, 0];

  broadcasterSocket.emit('question', { text, options, correctAnswer });
  socketsPlaying.forEach((socket) => {
    socket.emit('question', { text, options }, (chosenAnswer) => {
      votes[chosenAnswer] += 1;
    });
  });

  setTimeout(() => {
    broadcasterSocket.emit('answer', votes);
    socketsPlaying.forEach((socket) => {
      socket.emit('answer', { votes, correctAnswer });
    });

    const socketsToBeAddedLength = socketsToBeAdded.length;
    for (let idx = 0; idx < socketsToBeAddedLength; idx += 1) {
      const socket = socketsToBeAdded.pop();
      socketsPlaying.push(socket);
    }
    isAsking = false;
    currentQuestion += 1;
  }, 20000);
};

io.on('connection', (socket) => {
  socket.on('is-player', () => {
    (isAsking ? socketsToBeAdded : socketsPlaying).push(socket);
  });

  socket.on('is-broadcaster', () => {
    if (broadcasterSocket) {
      broadcasterSocket.disconnect();
    }

    broadcasterSocket = socket;
    broadcasterSocket.on('ask-question', sendQuestion);
  });
});

server.listen(process.env.PORT || 8080);
